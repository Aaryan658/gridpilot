/*
 * GridPilot 5-bay hardware rig firmware (ESP32)
 * ------------------------------------------------
 * Connects to the laptop-hosted OCPP 1.6J central system
 * (python scripts/start_ocpp.py) as FIVE independent charge points —
 * RIG_BAY_1..RIG_BAY_5 — because that's how the backend addresses bays
 * (see ocpp_mock/central_system.py + ocpp_mock/gridpilot_bridge.py).
 *
 * IMPORTANT — read this before you assume it's a bug that this isn't using
 * the MicroOCPP library's normal API:
 *
 *   MicroOCPP (matth-x/MicroOcpp) is built around ONE charge-point identity
 *   per firmware image — its convenience API (mocpp_initialize/mocpp_loop/
 *   setSmartChargingPowerOutput/...) is a set of functions bound to a single
 *   global WebSocket connection. It does not support running 5 independent
 *   OCPP client identities (5 separate WebSocket connections, 5 separate
 *   charge-point IDs) from one sketch. Since this rig is 1 ESP32 + 5 relays
 *   (not 5 separate ESP32 boards), and the backend expects 5 separate
 *   RIG_BAY_<n> connections, true MicroOCPP doesn't fit this rig's topology.
 *
 *   Instead, this firmware hand-implements the tiny slice of OCPP-J 1.6
 *   actually needed here — receiving a `SetChargingProfile` Call and
 *   replying with a CallResult — using WebSocketsClient + ArduinoJson. This
 *   is real OCPP-J wire protocol (verified line-by-line against
 *   ocpp_mock/central_system.py's send_charging_profile()), just not routed
 *   through the MicroOCPP state-machine library. It only needs to parse one
 *   message shape, so there's very little room for library-version guessing
 *   to go wrong — unlike MicroOCPP's API, which does shift between versions.
 *
 *   If you later move to 5 separate ESP32 boards (one per bay), you could
 *   swap each bay's block below for real MicroOCPP's single-CP API. Not
 *   needed for the current 1-ESP32-plus-relay-bank rig.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_INA219.h>
#include <math.h>

// ============================================================================
// CONFIG — EDIT THESE before flashing
// ============================================================================

// --- WiFi (must be the SAME network as the laptop running start_ocpp.py) ---
const char* WIFI_SSID     = "LAPTOP-KAL2ADTI 6961";
const char* WIFI_PASSWORD = "35h07W}5";

// --- Laptop's LAN IP address (NOT localhost/127.0.0.1 — see the guide for
//     how to find this with `ipconfig`). Example: "192.168.1.42" ---
const char* LAPTOP_IP = "192.168.137.1";
const uint16_t OCPP_PORT    = 9000; // scripts/start_ocpp.py --ocpp-port
const uint16_t TRIGGER_PORT = 9001; // scripts/start_ocpp.py --trigger-port

// --- GPIO pin assignments — re-confirmed via the latest Cirkit wiring
//     export (relay IN pins are confirmed real). Relay order below matches
//     the order given for the 5 relay instances: 57753f04, d772674f,
//     c829ff04, 566f5bed, eb11e8f5 -> bays 1-5. VERIFY this order matches
//     which physical bay each relay actually switches on your board.
//     NOTE: the wiring export still shows all 5 relay modules wired to the
//     ESP32 (RX2/TX2/D18/D19/D23) -- if you physically removed 2 relays,
//     double-check bays 4-5 (D19/D23) are still actually populated before
//     relying on this array as-is.
// --- Rig now has THREE physical relays. TX2 (GPIO17) and D23 (GPIO23) are
//     no longer used — those were old bays 2 and 5. Remaining bays 1-3 map
//     to the old physical bays 1, 3, 4.
const int NUM_BAYS = 3;
int RELAY_PINS[NUM_BAYS] = {16, 18, 19}; // RX2, D18, D19

// --- Per-bay indicator LEDs — re-confirmed via the latest Cirkit wiring
//     export. Real wiring has 11 GPIO-driven LED/resistor channels: 5
//     green, 5 blue, 1 red -- one GREEN (idle) + BLUE (charging) pair per
//     bay, plus a single system-wide RED (overload). There is no separate
//     "system ready" green LED anymore: pin 27 (previously that role) is
//     now bay 1's green LED, and bay 1's blue LED moved from pin 5 (no
//     longer wired to anything) to pin 4.
//     Bay order assumes left-to-right physical position matches bay 1-5,
//     same assumption as the relay instance order -- confirm against the
//     physical board before the demo if any bay's LEDs look swapped.
//     (Three more LEDs are wired directly to relay N.O. contacts as mains-
//     side pilot lights, not to any ESP32 GPIO -- those aren't in this list
//     and can't be controlled from firmware.)
// LED pins for the 3 remaining bays (old bays 1, 3, 4 -> new bays 1-3).
int BAY_GREEN_PINS[NUM_BAYS] = {27, 13, 25}; // idle indicator per bay
int BAY_BLUE_PINS[NUM_BAYS]  = {4, 14, 26};  // charging indicator per bay

const int SYSTEM_RED_PIN = 15; // lone red LED -- lit on OVERLOAD (see readSensorsAndUpdateDisplay)

const int BOOT_BUTTON_PIN = 0; // fixed — this is the ESP32's built-in BOOT button

// I2C (INA219 + LCD) uses the ESP32's default pins: SDA=21, SCL=22.
// Only change these if your board silkscreens different default I2C pins.

// --- Relay polarity — MOST cheap 5V relay boards are ACTIVE-LOW (a LOW
//     signal energizes the relay / turns the load ON). Some are ACTIVE-HIGH.
//     Verify yours: with this set wrong, "OFF" and "ON" will be swapped.
//     Test: flash, and check whether bay 1's relay clicks ON immediately at
//     power-up (before WiFi even connects) — if so, flip this to false.
const bool RELAY_ACTIVE_LOW = true;

// --- Overload thresholds (Amps) — from hardware_demo_evaluation.md §3 ---
const float THRESHOLD_SAFE_MAX = 0.45f; // < this: SAFE (green)
const float THRESHOLD_WARN_MAX = 0.54f; // 0.45-0.54: WARNING (yellow); > this: OVERLOAD (red)

// ============================================================================
// Globals
// ============================================================================

WebSocketsClient bayWs[NUM_BAYS];
bool bayState[NUM_BAYS] = {false, false, false};
bool bayConnected[NUM_BAYS] = {false, false, false};

LiquidCrystal_I2C lcd(0x27, 16, 2); // matches arduino_ide/test/test.ino
Adafruit_INA219 ina219;
bool ina219Ready = false;
float currentOffsetA = 0.0f;

volatile bool buttonFlag = false;
unsigned long lastButtonMs = 0;
const unsigned long BUTTON_DEBOUNCE_MS = 400;

enum Mode { MODE_UNMANAGED, MODE_MANAGED };
Mode currentMode = MODE_UNMANAGED;

unsigned long lastSensorMs = 0;
const unsigned long SENSOR_INTERVAL_MS = 200;

unsigned long lastWifiCheckMs = 0;
const unsigned long WIFI_RETRY_INTERVAL_MS = 30000;

float lastCurrentA = 0.0f;

// ============================================================================
// Relay / LED control
// ============================================================================

void setBayRelay(int bay, bool on) {
  bool level = RELAY_ACTIVE_LOW ? !on : on;
  digitalWrite(RELAY_PINS[bay], level ? HIGH : LOW);
  digitalWrite(BAY_GREEN_PINS[bay], on ? LOW : HIGH); // idle green off while charging
  digitalWrite(BAY_BLUE_PINS[bay], on ? HIGH : LOW);  // blue on while charging
  bayState[bay] = on;
  Serial.printf("[BAY %d] -> %s\n", bay + 1, on ? "ON" : "OFF");
}

void allRelaysOff() {
  for (int i = 0; i < NUM_BAYS; i++) setBayRelay(i, false);
}

// --- Local demo-mode control ------------------------------------------------
// The rig decides bay states itself, so the demo works even if the laptop /
// OCPP server is unreachable. "Without GridPilot" (MODE_UNMANAGED) = all 3
// bays charge at once — the overload moment. "With GridPilot" (MODE_MANAGED)
// = staggered charging: exactly 1 bay on, rotating every MANAGED_ROTATE_MS
// so every bay still gets its turn. Relays stay OFF at boot until the first
// BOOT-button press activates a mode.
bool localModeActive = false;
int managedRotateIdx = 0;
unsigned long lastManagedRotateMs = 0;
const unsigned long MANAGED_ROTATE_MS = 5000;

void applyLocalMode() {
  if (!localModeActive) return;
  for (int i = 0; i < NUM_BAYS; i++) {
    bool on;
    if (currentMode == MODE_UNMANAGED) {
      on = true; // everyone charges at once -> overload demo
    } else {
      on = (i == managedRotateIdx); // one bay at a time, staggered
    }
    if (bayState[i] != on) setBayRelay(i, on);
  }
}

void tickManagedRotation() {
  if (!localModeActive || currentMode != MODE_MANAGED) return;
  unsigned long now = millis();
  if (now - lastManagedRotateMs < MANAGED_ROTATE_MS) return;
  lastManagedRotateMs = now;
  managedRotateIdx = (managedRotateIdx + 1) % NUM_BAYS;
  applyLocalMode();
}

// ============================================================================
// OCPP-J message handling (minimal hand-rolled subset — see header comment)
// ============================================================================
//
// Inbound CALL from the central system looks like:
//   [2, "<uniqueId>", "SetChargingProfile",
//     {"connectorId": 1, "csChargingProfiles": {
//        "chargingSchedule": {"chargingSchedulePeriod": [{"limit": 7400, ...}]}
//     }}]
// (verified against ocpp_mock/central_system.py::send_charging_profile)
//
// We reply with a CALLRESULT:
//   [3, "<uniqueId>", {"status": "Accepted"}]

void handleOcppMessage(int bay, uint8_t* payload, size_t length) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.printf("[BAY %d] JSON parse failed: %s\n", bay + 1, err.c_str());
    return;
  }

  int messageType = doc[0].as<int>();
  if (messageType != 2) {
    // Not a CALL (could be a CALLRESULT/CALLERROR echo, or something we
    // don't expect) — nothing to do.
    return;
  }

  String uniqueId = doc[1].as<String>();
  String action = doc[2].as<String>();

  if (action == "SetChargingProfile") {
    JsonVariant limitVar =
        doc[3]["csChargingProfiles"]["chargingSchedule"]["chargingSchedulePeriod"][0]["limit"];
    float limitWatts = limitVar.isNull() ? 0.0f : limitVar.as<float>();
    bool shouldBeOn = limitWatts > 0.0f;

    // Relays are locally controlled now (see applyLocalMode) — the server's
    // profile is acknowledged and logged, but no longer drives the relay.
    Serial.printf("[BAY %d] SetChargingProfile: limit=%.0fW -> %s (info only, relays locally controlled)\n",
                  bay + 1, limitWatts, shouldBeOn ? "ON" : "OFF");

    String response = "[3,\"" + uniqueId + "\",{\"status\":\"Accepted\"}]";
    bayWs[bay].sendTXT(response);
  } else {
    // We only implement SetChargingProfile. Politely decline anything else
    // so the central system doesn't hang waiting for a reply.
    String response = "[4,\"" + uniqueId + "\",\"NotImplemented\",\"Only SetChargingProfile is supported\",{}]";
    bayWs[bay].sendTXT(response);
  }
}

// WebSocketsClient calls one shared handler with a fixed signature per
// instance — we need 5 tiny trampoline functions so each bay's socket routes
// to the same shared logic with its own bay index attached.

void onWsEventShared(int bay, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      bayConnected[bay] = true;
      Serial.printf("[BAY %d] WebSocket connected\n", bay + 1);
      break;
    case WStype_DISCONNECTED:
      bayConnected[bay] = false;
      Serial.printf("[BAY %d] WebSocket disconnected\n", bay + 1);
      break;
    case WStype_TEXT:
      handleOcppMessage(bay, payload, length);
      break;
    default:
      break;
  }
}

void onWsEvent0(WStype_t type, uint8_t* payload, size_t length) { onWsEventShared(0, type, payload, length); }
void onWsEvent1(WStype_t type, uint8_t* payload, size_t length) { onWsEventShared(1, type, payload, length); }
void onWsEvent2(WStype_t type, uint8_t* payload, size_t length) { onWsEventShared(2, type, payload, length); }

void connectAllBayWebsockets() {
  // Using a plain function-pointer array here (rather than the library's
  // own callback typedef, whose exact name has changed across WebSockets
  // library versions) so this compiles regardless of version.
  void (*handlers[NUM_BAYS])(WStype_t, uint8_t*, size_t) = {
      onWsEvent0, onWsEvent1, onWsEvent2};
  for (int i = 0; i < NUM_BAYS; i++) {
    String path = "/RIG_BAY_" + String(i + 1);
    bayWs[i].begin(LAPTOP_IP, OCPP_PORT, path, "ocpp1.6");
    bayWs[i].onEvent(handlers[i]);
    bayWs[i].setReconnectInterval(3000);
  }
}

// ============================================================================
// Mode toggle (BOOT button -> POST /mode on the trigger API)
// ============================================================================

void IRAM_ATTR onButtonPress() {
  buttonFlag = true;
}

void postModeTrigger(const char* mode) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Skipped POST /mode — WiFi not connected");
    return;
  }
  HTTPClient http;
  String url = String("http://") + LAPTOP_IP + ":" + String(TRIGGER_PORT) + "/mode";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  String body = String("{\"mode\":\"") + mode + "\"}";
  int httpCode = http.POST(body);
  Serial.printf("[HTTP] POST /mode {%s} -> %d\n", mode, httpCode);
  http.end();
}

void handleButton() {
  if (!buttonFlag) return;
  unsigned long now = millis();
  if (now - lastButtonMs < BUTTON_DEBOUNCE_MS) {
    buttonFlag = false;
    return;
  }
  lastButtonMs = now;
  buttonFlag = false;

  currentMode = (currentMode == MODE_UNMANAGED) ? MODE_MANAGED : MODE_UNMANAGED;
  localModeActive = true;
  managedRotateIdx = 0;
  lastManagedRotateMs = millis();
  applyLocalMode(); // relays + blue/green LEDs switch immediately, no server needed
  // Still notify the laptop (if reachable) so its dashboard can mirror the mode.
  postModeTrigger(currentMode == MODE_UNMANAGED ? "unmanaged" : "managed");
}

// ============================================================================
// Current sensing + LCD/LED status
// ============================================================================

int connectedBayCount() {
  int n = 0;
  for (int i = 0; i < NUM_BAYS; i++) if (bayConnected[i]) n++;
  return n;
}

// Prints every device that ACKs on the I2C bus. With the rig healthy this
// must show 0x27 (LCD backpack) and 0x40 (INA219). Which one is missing
// tells you whether the whole bus is down or just one device.
void scanI2CBus() {
  Serial.print("[I2C] Scan:");
  int found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf(" 0x%02X", addr);
      found++;
    }
  }
  Serial.printf(" -> %d device(s); expected LCD=0x27, INA219=0x40\n", found);
}

void calibrateCurrentOffset() {
  Serial.println("[CAL] Reading baseline current with all bays off...");
  float sum = 0;
  int validSamples = 0;
  const int samples = 20;
  for (int i = 0; i < samples; i++) {
    float current_mA = ina219.getCurrent_mA();
    if (isfinite(current_mA)) {
      sum += current_mA;
      validSamples++;
    } else {
      Serial.println("[CAL] Ignoring invalid INA219 current sample");
    }
    delay(50);
  }
  currentOffsetA = validSamples > 0 ? (sum / validSamples) / 1000.0f : 0.0f;
  Serial.printf("[CAL] Offset = %.4f A (%d/%d valid samples)\n",
                currentOffsetA, validSamples, samples);
}

const char* statusLabel(float amps) {
  if (!isfinite(amps)) return "SENSOR";
  if (amps < THRESHOLD_SAFE_MAX) return "SAFE";
  if (amps <= THRESHOLD_WARN_MAX) return "WARNING";
  return "OVERLOAD";
}

void updateLcd(float amps) {
  lcd.setCursor(0, 0);
  char line0[17];
  snprintf(line0, sizeof(line0), "%-9s %d/%d up",
           currentMode == MODE_UNMANAGED ? "NO GP" : "GRIDPILOT",
           connectedBayCount(), NUM_BAYS);
  lcd.print(line0);

  lcd.setCursor(0, 1);
  char line1[17];
  if (isfinite(amps)) {
    snprintf(line1, sizeof(line1), "%.3fA %-8s", amps, statusLabel(amps));
  } else {
    snprintf(line1, sizeof(line1), "%-16s", "INA219 READ ERR");
  }
  lcd.print(line1);
}

// Mirrors the LCD's content to the Serial Monitor (USB) every
// SERIAL_STATUS_INTERVAL_MS, plus per-bay ON/OFF state, which the 16x2 LCD
// has no room to show. This is how you see the rig's status on the laptop
// without walking over to read the LCD.
unsigned long lastStatusPrintMs = 0;
const unsigned long SERIAL_STATUS_INTERVAL_MS = 2000;

void printSerialStatus(float amps, float loadVoltage) {
  Serial.printf("[STATUS] Mode=%s Bays=%d/%d connected | ",
                currentMode == MODE_UNMANAGED ? "WITHOUT GRIDPILOT" : "WITH GRIDPILOT",
                connectedBayCount(), NUM_BAYS);
  for (int i = 0; i < NUM_BAYS; i++) {
    Serial.printf("B%d:%s ", i + 1, bayState[i] ? "ON" : "OFF");
  }
  if (isfinite(amps)) {
    Serial.printf("| Current=%.3fA Voltage=%.2fV %s\n",
                  amps, loadVoltage, statusLabel(amps));
  } else {
    Serial.println("| Current=INVALID INA219_READ_ERROR");
  }
}

void readSensorsAndUpdateDisplay() {
  // --- INA219 recovery: attempt reconnect at most every 5 s ---
  if (!ina219Ready) {
    static unsigned long lastReconnectMs = 0;
    unsigned long nowMs = millis();
    if (nowMs - lastReconnectMs >= 5000) {
      lastReconnectMs = nowMs;
      ina219Ready = ina219.begin();
      if (ina219Ready) {
        Serial.println("[INA219] Reconnected");
        delay(100);
        calibrateCurrentOffset();
      } else {
        Serial.println("[INA219] Still not found on I2C bus");
        scanI2CBus();
      }
    }
  }

  // --- Only read bus if sensor is confirmed ready ---
  float shunt_mV = 0.0f, bus_V = 0.0f, current_mA = NAN, loadVoltage = 0.0f;
  float amps = NAN;

  if (ina219Ready) {
    shunt_mV   = ina219.getShuntVoltage_mV();
    bus_V      = ina219.getBusVoltage_V();
    current_mA = ina219.getCurrent_mA();
    loadVoltage = bus_V + (shunt_mV / 1000.0f);

    if (isfinite(current_mA)) {
      // fabsf: if the sensor is wired with reversed polarity (current
      // entering VIN- instead of VIN+), the chip reports negative current.
      // Magnitude is what the demo needs, so display it either way.
      amps = fabsf((current_mA / 1000.0f) - currentOffsetA);
    } else {
      // Sensor present but returned garbage — could be transient I2C glitch
      static unsigned long lastInaErrLogMs = 0;
      unsigned long nowMs = millis();
      if (nowMs - lastInaErrLogMs >= 5000) {
        lastInaErrLogMs = nowMs;
        Serial.println("[INA219] Transient bad read — will retry");
      }
    }
  }
  // If ina219Ready is false, amps stays NAN and the LCD shows "INA219 READ ERR"

  lastCurrentA = amps;

  // TEMP DEBUG — raw sensor values before the offset/clamp math, printed at
  // the same cadence as [STATUS]. shuntA = shunt_mV / 0.1 ohm is an
  // independent Ohm's-law cross-check that bypasses the INA219's internal
  // calibration register. Remove once the 0.00A issue is diagnosed.
  if (ina219Ready && millis() - lastStatusPrintMs >= SERIAL_STATUS_INTERVAL_MS) {
    Serial.printf("[DEBUG] raw=%.1fmA offset=%.4fA shunt=%.3fmV shuntA=%.3fA bus=%.2fV\n",
                  current_mA, currentOffsetA, shunt_mV, (shunt_mV / 1000.0f) / 0.1f, bus_V);
  }

  updateLcd(amps);
  digitalWrite(SYSTEM_RED_PIN,
               isfinite(amps) && amps > THRESHOLD_WARN_MAX ? HIGH : LOW); // OVERLOAD indicator

  unsigned long now = millis();
  if (now - lastStatusPrintMs >= SERIAL_STATUS_INTERVAL_MS) {
    lastStatusPrintMs = now;
    printSerialStatus(amps, loadVoltage);
  }
}

// ============================================================================
// WiFi
// ============================================================================

void connectWifi() {
  Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WIFI] Connected. IP=%s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[WIFI] Failed to connect within 20s — will keep retrying in loop().");
  }
}

void maintainWifi() {
  unsigned long now = millis();
  if (WiFi.status() == WL_CONNECTED) {
    lastWifiCheckMs = now;
    return;
  }
  // Auto-reconnect (enabled in connectWifi) keeps retrying on its own.
  // Calling WiFi.begin() while an attempt is mid-flight aborts it with
  // "wifi:sta is connecting, cannot set config" — so only force a full
  // restart of the connection after a long stretch offline.
  if (now - lastWifiCheckMs < WIFI_RETRY_INTERVAL_MS) return;
  lastWifiCheckMs = now;
  Serial.println("[WIFI] Still disconnected — restarting connection attempt...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ============================================================================
// Setup / loop
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=== GridPilot Rig Firmware ===");

  for (int i = 0; i < NUM_BAYS; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    pinMode(BAY_GREEN_PINS[i], OUTPUT);
    pinMode(BAY_BLUE_PINS[i], OUTPUT);
  }
  pinMode(SYSTEM_RED_PIN, OUTPUT);
  allRelaysOff();

  // --- Boot LED test: walks every bay's GREEN then BLUE (then the system
  //     RED) one at a time, with a serial label for each. Watch the board
  //     during boot: if a printed label lights no LED (or the wrong one),
  //     that pin's entry in BAY_GREEN_PINS/BAY_BLUE_PINS is mapped wrong.
  for (int i = 0; i < NUM_BAYS; i++) {
    Serial.printf("[LEDTEST] Bay %d GREEN (GPIO%d)\n", i + 1, BAY_GREEN_PINS[i]);
    digitalWrite(BAY_GREEN_PINS[i], HIGH);
    delay(600);
    digitalWrite(BAY_GREEN_PINS[i], LOW);
    Serial.printf("[LEDTEST] Bay %d BLUE (GPIO%d)\n", i + 1, BAY_BLUE_PINS[i]);
    digitalWrite(BAY_BLUE_PINS[i], HIGH);
    delay(600);
    digitalWrite(BAY_BLUE_PINS[i], LOW);
  }
  Serial.printf("[LEDTEST] System RED (GPIO%d)\n", SYSTEM_RED_PIN);
  digitalWrite(SYSTEM_RED_PIN, HIGH);
  delay(600);
  digitalWrite(SYSTEM_RED_PIN, LOW);
  // Restore idle LED state (greens on, blues off) after the test.
  allRelaysOff();

  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(BOOT_BUTTON_PIN), onButtonPress, FALLING);

  Wire.begin(21, 22); // explicit ESP32 I2C pins; matches arduino_ide/test/test.ino
  scanI2CBus();

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("GridPilot Rig");
  lcd.setCursor(0, 1);
  lcd.print("Booting...");

  ina219Ready = ina219.begin();
  if (!ina219Ready) {
    Serial.println("[INA219] Not found on I2C bus! Check wiring/address.");
    Serial.println("[INA219] Firmware will keep retrying — rig will still connect and relay.");
    lcd.setCursor(0, 1);
    lcd.print("INA219 MISSING");
  } else {
    delay(100);
    Serial.println("[INA219] Ready");
  }

  connectWifi();
  // Only calibrate if sensor actually initialised — skip silently otherwise
  if (ina219Ready) calibrateCurrentOffset();
  connectAllBayWebsockets();

  Serial.println("[SETUP] Done. Entering main loop.");
}

void loop() {
  for (int i = 0; i < NUM_BAYS; i++) {
    bayWs[i].loop();
  }

  maintainWifi();
  handleButton();
  tickManagedRotation();

  unsigned long now = millis();
  if (now - lastSensorMs >= SENSOR_INTERVAL_MS) {
    lastSensorMs = now;
    readSensorsAndUpdateDisplay();
  }
}
