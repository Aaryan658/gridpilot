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

// ============================================================================
// CONFIG — EDIT THESE before flashing
// ============================================================================

// --- WiFi (must be the SAME network as the laptop running start_ocpp.py) ---
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// --- Laptop's LAN IP address (NOT localhost/127.0.0.1 — see the guide for
//     how to find this with `ipconfig`). Example: "192.168.1.42" ---
const char* LAPTOP_IP = "192.168.1.42";
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
int RELAY_PINS[5] = {16, 17, 18, 19, 23}; // RX2, TX2, D18, D19, D23

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
int BAY_GREEN_PINS[5] = {27, 33, 13, 25, 2}; // idle indicator per bay
int BAY_BLUE_PINS[5]  = {4, 12, 14, 26, 32}; // charging indicator per bay

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

WebSocketsClient bayWs[5];
bool bayState[5] = {false, false, false, false, false};
bool bayConnected[5] = {false, false, false, false, false};

LiquidCrystal_I2C lcd(0x27, 16, 2); // change 0x27 to 0x3F if your LCD backpack uses that address (see guide)
Adafruit_INA219 ina219;
float currentOffsetA = 0.0f;

volatile bool buttonFlag = false;
unsigned long lastButtonMs = 0;
const unsigned long BUTTON_DEBOUNCE_MS = 400;

enum Mode { MODE_UNMANAGED, MODE_MANAGED };
Mode currentMode = MODE_UNMANAGED;

unsigned long lastSensorMs = 0;
const unsigned long SENSOR_INTERVAL_MS = 200;

unsigned long lastWifiCheckMs = 0;
const unsigned long WIFI_CHECK_INTERVAL_MS = 5000;

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
  for (int i = 0; i < 5; i++) setBayRelay(i, false);
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

    Serial.printf("[BAY %d] SetChargingProfile: limit=%.0fW -> %s\n",
                  bay + 1, limitWatts, shouldBeOn ? "ON" : "OFF");
    setBayRelay(bay, shouldBeOn);

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
void onWsEvent3(WStype_t type, uint8_t* payload, size_t length) { onWsEventShared(3, type, payload, length); }
void onWsEvent4(WStype_t type, uint8_t* payload, size_t length) { onWsEventShared(4, type, payload, length); }

void connectAllBayWebsockets() {
  // Using a plain function-pointer array here (rather than the library's
  // own callback typedef, whose exact name has changed across WebSockets
  // library versions) so this compiles regardless of version.
  void (*handlers[5])(WStype_t, uint8_t*, size_t) = {
      onWsEvent0, onWsEvent1, onWsEvent2, onWsEvent3, onWsEvent4};
  for (int i = 0; i < 5; i++) {
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
  postModeTrigger(currentMode == MODE_UNMANAGED ? "unmanaged" : "managed");
  // Relay states themselves are NOT set here — they update reactively as
  // each bay's SetChargingProfile call arrives over its own WebSocket.
}

// ============================================================================
// Current sensing + LCD/LED status
// ============================================================================

int connectedBayCount() {
  int n = 0;
  for (int i = 0; i < 5; i++) if (bayConnected[i]) n++;
  return n;
}

void calibrateCurrentOffset() {
  Serial.println("[CAL] Reading baseline current with all bays off...");
  float sum = 0;
  const int samples = 20;
  for (int i = 0; i < samples; i++) {
    sum += ina219.getCurrent_mA();
    delay(20);
  }
  currentOffsetA = (sum / samples) / 1000.0f;
  Serial.printf("[CAL] Offset = %.4f A\n", currentOffsetA);
}

const char* statusLabel(float amps) {
  if (amps < THRESHOLD_SAFE_MAX) return "SAFE";
  if (amps <= THRESHOLD_WARN_MAX) return "WARNING";
  return "OVERLOAD";
}

void updateLcd(float amps) {
  lcd.setCursor(0, 0);
  char line0[17];
  snprintf(line0, sizeof(line0), "%-8s %d/5 up",
           currentMode == MODE_UNMANAGED ? "UNMANAGD" : "MANAGED", connectedBayCount());
  lcd.print(line0);

  lcd.setCursor(0, 1);
  char line1[17];
  snprintf(line1, sizeof(line1), "%.2fA %-9s", amps, statusLabel(amps));
  lcd.print(line1);
}

// Mirrors the LCD's content to the Serial Monitor (USB) every
// SERIAL_STATUS_INTERVAL_MS, plus per-bay ON/OFF state, which the 16x2 LCD
// has no room to show. This is how you see the rig's status on the laptop
// without walking over to read the LCD.
unsigned long lastStatusPrintMs = 0;
const unsigned long SERIAL_STATUS_INTERVAL_MS = 2000;

void printSerialStatus(float amps) {
  Serial.printf("[STATUS] Mode=%s Bays=%d/5 connected | ",
                currentMode == MODE_UNMANAGED ? "UNMANAGED" : "MANAGED",
                connectedBayCount());
  for (int i = 0; i < 5; i++) {
    Serial.printf("B%d:%s ", i + 1, bayState[i] ? "ON" : "OFF");
  }
  Serial.printf("| Current=%.2fA %s\n", amps, statusLabel(amps));
}

void readSensorsAndUpdateDisplay() {
  float rawA = ina219.getCurrent_mA() / 1000.0f;
  float amps = rawA - currentOffsetA;
  if (amps < 0) amps = 0;
  lastCurrentA = amps;

  updateLcd(amps);
  digitalWrite(SYSTEM_RED_PIN, amps > THRESHOLD_WARN_MAX ? HIGH : LOW); // OVERLOAD indicator

  unsigned long now = millis();
  if (now - lastStatusPrintMs >= SERIAL_STATUS_INTERVAL_MS) {
    lastStatusPrintMs = now;
    printSerialStatus(amps);
  }
}

// ============================================================================
// WiFi
// ============================================================================

void connectWifi() {
  Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
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
  if (now - lastWifiCheckMs < WIFI_CHECK_INTERVAL_MS) return;
  lastWifiCheckMs = now;
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Disconnected — reconnecting...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

// ============================================================================
// Setup / loop
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=== GridPilot Rig Firmware ===");

  for (int i = 0; i < 5; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    pinMode(BAY_GREEN_PINS[i], OUTPUT);
    pinMode(BAY_BLUE_PINS[i], OUTPUT);
  }
  pinMode(SYSTEM_RED_PIN, OUTPUT);
  allRelaysOff();

  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(BOOT_BUTTON_PIN), onButtonPress, FALLING);

  Wire.begin(); // default SDA=21, SCL=22 on most ESP32 dev boards

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("GridPilot Rig");
  lcd.setCursor(0, 1);
  lcd.print("Booting...");

  if (!ina219.begin()) {
    Serial.println("[INA219] Not found on I2C bus! Check wiring/address.");
    lcd.setCursor(0, 1);
    lcd.print("INA219 ERROR!");
  }

  connectWifi();
  calibrateCurrentOffset();
  connectAllBayWebsockets();

  Serial.println("[SETUP] Done. Entering main loop.");
}

void loop() {
  for (int i = 0; i < 5; i++) {
    bayWs[i].loop();
  }

  maintainWifi();
  handleButton();

  unsigned long now = millis();
  if (now - lastSensorMs >= SENSOR_INTERVAL_MS) {
    lastSensorMs = now;
    readSensorsAndUpdateDisplay();
  }
}
