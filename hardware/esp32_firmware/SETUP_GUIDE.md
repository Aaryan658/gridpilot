# GridPilot Rig — ESP32 Setup Guide (Beginner Walkthrough)

This guide assumes you have never flashed a microcontroller or wired up
electronics before. Follow it in order — don't skip to wiring before the
software step, because you'll want to test the firmware against the mock
backend (no real relays needed) before you trust it with real hardware.

Firmware code lives in this same folder: [`src/main.cpp`](src/main.cpp) and
[`platformio.ini`](platformio.ini). Read the big comment at the top of
`main.cpp` first — it explains an important design decision (why this
doesn't use MicroOCPP's normal single-connection API) before you look at
anything else.

---

## 0. What you're building, in one paragraph

Your laptop runs `scripts/start_ocpp.py`, which is the "brain" — it runs the
real optimizer and decides which of the 5 bays should be charging. The ESP32
is a "dumb" actuator: it opens 5 WebSocket connections to your laptop (one
per bay), and whenever your laptop tells a bay "turn on" or "turn off", the
ESP32 flips that bay's relay. Separately, an INA219 sensor measures the real
current flowing through the resistors and shows SAFE/WARNING/OVERLOAD on an
LCD + 3 status LEDs. A press of the ESP32's BOOT button tells your laptop to
switch between "unmanaged" (all 5 bays try to charge at once → overload) and
"managed" (GridPilot staggers them → safe).

---

## 1. Install the software (one-time setup)

You need an editor with PlatformIO — it manages the ESP32 toolchain and
libraries for you, so you don't need to install anything by hand.

1. Install **Visual Studio Code**: https://code.visualstudio.com/
2. Open VS Code → Extensions (left sidebar, the squares icon) → search
   **"PlatformIO IDE"** → Install. This takes a few minutes and installs the
   ESP32 compiler toolchain automatically the first time you build.
3. Install the **CP2102 or CH340 USB driver** for your ESP32 board (most
   ESP32 dev boards use one of these two USB-to-serial chips). If Windows
   already shows a COM port when you plug in the board (Device Manager →
   Ports), you can skip this — the driver is already installed.

> **Arduino IDE alternative:** if you'd rather use the Arduino IDE instead of
> PlatformIO, install these libraries via Library Manager instead of
> `platformio.ini`'s `lib_deps`: `WebSockets` (by Markus Sattler/Links2004),
> `ArduinoJson` (by Benoit Blanchon, v7.x), `LiquidCrystal I2C` (by John
> Rickman), `Adafruit INA219` (installs `Adafruit BusIO` automatically). Then
> copy `src/main.cpp`'s contents into a `.ino` file of the same name as its
> folder. Everything below still applies; only the "how to open/flash the
> project" step differs.

---

## 2. Find your laptop's IP address

The ESP32 needs your laptop's **local network IP** (not `localhost` —
that only means "this machine" and the ESP32 is a different machine).

1. Connect your laptop to the WiFi you'll use at the venue.
2. Open a terminal (PowerShell) and run:
   ```
   ipconfig
   ```
3. Look for the network adapter matching your WiFi (usually "Wireless LAN
   adapter Wi-Fi") and note its **IPv4 Address**, e.g. `192.168.1.42`.
4. Both your laptop and the ESP32 **must be on this same WiFi network**. If
   the venue WiFi isolates devices from each other ("client isolation" /
   "AP isolation" — common on public/guest WiFi), this won't work — use a
   personal hotspot or a dedicated router instead. Ask the venue in advance.

---

## 3. Configure the firmware

Open [`src/main.cpp`](src/main.cpp) in VS Code and edit the `CONFIG` block
near the top:

```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* LAPTOP_IP     = "192.168.1.42";   // from step 2
```

Leave `OCPP_PORT` (9000) and `TRIGGER_PORT` (9001) as-is — they match
`scripts/start_ocpp.py`'s defaults.

Leave the GPIO pin numbers and `RELAY_ACTIVE_LOW` at their defaults for now
— you'll verify/adjust those in the wiring section below, **before** you
trust the board to switch anything.

---

## 4. Wiring

### 4a. Safety first (read this before connecting anything)

This is copied from [`hardware_demo_evaluation.md`](../../hardware_demo_evaluation.md)
§6 — do all of these before powering anything on:

- No mains AC anywhere on the board — 12V DC only.
- A 3A or 5A inline fuse on the +12V rail (protects against shorts).
- No exposed 18650 lithium cells — use dummies if they're just for looks.
- Relay output terminals heat-shrunk or hot-glued (no exposed contacts).
- Power resistors labeled "HOT SURFACE" — they do get warm.
- Power the ESP32 via USB (from a laptop/powerbank) or a buck converter —
  **never** wire the raw 12V rail into the ESP32's `Vin`/`5V` pin directly.

### 4b. I2C bus (INA219 + LCD) — shared, only 2 wires

The INA219 current sensor and the 16×2 LCD both sit on the same I2C bus.
On a standard ESP32 dev board, I2C defaults to:

| Signal | ESP32 pin |
|---|---|
| SDA | GPIO 21 |
| SCL | GPIO 22 |
| VCC | 3.3V or 5V (check your specific INA219/LCD board's rating — most breakout boards tolerate either) |
| GND | GND |

Wire **both** the INA219 and the LCD's SDA to GPIO 21, both SCL to GPIO 22,
and both to shared GND. That's it — I2C lets multiple devices share 2 wires
because each has its own address.

**Find your LCD's I2C address**: cheap LCD backpacks are usually `0x27` or
`0x3F`. The firmware defaults to `0x27` (`LiquidCrystal_I2C lcd(0x27, 16, 2);`
near the top of `main.cpp`). If the LCD stays blank after flashing (backlight
on, no text), try changing this to `0x3F`. If you want to be certain
up front, you can run a generic "I2C scanner" Arduino sketch (search
"ESP32 I2C scanner sketch" — plenty of copy-paste examples) before flashing
the real firmware; it will print every I2C address found on the bus.

### 4c. INA219 current sensor placement

The INA219 measures current through its `V+`/`V-` (or `VIN+`/`VIN-`) screw
terminals or pads — **not** its power pins. Wire it in series with the
+12V rail, before it reaches the relay bank, so it measures the combined
current of all 5 bays together:

```
12V adapter (+) → INA219 VIN+  ...  INA219 VIN- → relay bank common +12V feed
12V adapter (–) → common GND (shared with ESP32 GND and relay bank GND)
```

### 4d. Relays, resistors, and per-bay LEDs

For **each of the 5 bays**:

```
ESP32 relay-control GPIO → Relay module IN pin
Relay module VCC → 5V (from ESP32 5V pin, or a separate 5V source — check your relay module's current draw; 5 relays can add up, a separate 5V supply is safer if you have one)
Relay module GND → common GND
Relay module COM → +12V rail (after the INA219 and fuse)
Relay module NO (Normally Open) → one leg of that bay's 100Ω resistor
Other leg of the 100Ω resistor → common GND (through the load path, back to the adapter's negative terminal / INA219's return path)
```

Each bay's indicator LED (through its 1kΩ current-limiting resistor) is a
**separate branch**, not in the load current path:

```
ESP32 bay-LED GPIO → 1kΩ resistor → LED anode
LED cathode → GND
```

### 4e. Status LEDs (SAFE/WARNING/OVERLOAD)

Three more LEDs (green/yellow/red), each through its own current-limiting
resistor (330Ω–1kΩ is fine — these just need to be visible, not calibrated):

```
ESP32 STATUS_LED_GREEN  → resistor → green LED anode  → cathode → GND
ESP32 STATUS_LED_YELLOW → resistor → yellow LED anode → cathode → GND
ESP32 STATUS_LED_RED    → resistor → red LED anode    → cathode → GND
```

### 4f. GPIO pin reference (matches `main.cpp`'s defaults)

| Function | ESP32 GPIO | Notes |
|---|---|---|
| Bay 1–5 relay control | 26, 27, 14, 13, 33 | `RELAY_PINS[]` in `main.cpp` |
| Bay 1–5 indicator LED | 25, 32, 4, 16, 17 | `BAY_LED_PINS[]` |
| Status LED — green | 18 | SAFE |
| Status LED — yellow | 19 | WARNING |
| Status LED — red | 23 | OVERLOAD |
| BOOT button | 0 | Fixed — built into the ESP32 board, no wiring needed |
| I2C SDA / SCL | 21 / 22 | INA219 + LCD, shared bus |

**These defaults avoid known-tricky ESP32 "strapping" pins (0, 2, 12, 15) and
the flash pins (6–11), but they don't know how your specific board is
already wired.** Before powering on for real:

- Use a multimeter in continuity mode to trace each relay module's IN wire
  back to the ESP32 pin it's actually connected to, and update `RELAY_PINS[]`
  in `main.cpp` to match if it differs from the table above.
- Same for the LEDs and `BAY_LED_PINS[]`.

### 4g. Relay polarity — check this before trusting "OFF" means off

Most cheap 5V relay boards are **active-LOW**: a LOW signal on the IN pin
energizes the relay (turns the load ON), and HIGH turns it OFF. Some boards
are the opposite. The firmware defaults to `RELAY_ACTIVE_LOW = true`.

**How to check:** flash the firmware (next section), then watch bay 1's
relay the moment the board powers up — the firmware sets all relays to the
"off" GPIO level before WiFi even connects. If the relay clicks ON right at
power-up (before anything else happens), your board is active-HIGH — open
`main.cpp` and change `RELAY_ACTIVE_LOW` to `false`, then re-flash.

---

## 5. Flash the firmware

1. Plug the ESP32 into your laptop via USB.
2. In VS Code, open the `hardware/esp32_firmware` folder (File → Open
   Folder). PlatformIO should detect `platformio.ini` and show a PlatformIO
   icon (alien head) in the left sidebar.
3. Click the PlatformIO icon → under `esp32dev` → **Build** (checkmark icon)
   first, to confirm it compiles. The first build downloads the ESP32
   toolchain and takes a few minutes — normal.
4. If Build succeeds, click **Upload** (right-arrow icon). VS Code will
   auto-detect the COM port; if it asks you to pick one, choose the port
   that appeared when you plugged in the board (check Device Manager →
   Ports if unsure).
5. Click **Monitor** (plug icon) to open the serial monitor at 115200 baud
   — you should see boot logs (`=== GridPilot Rig Firmware ===`, WiFi
   connecting, INA219 calibration, WebSocket connection attempts).

If Build fails with a library-related error, see **Troubleshooting** below
— this is exactly the kind of thing that can differ by library version, and
part of why this guide has you test against the mock backend before
soldering anything.

---

## 6. Test against the mock backend FIRST (no real relays needed)

Do this before you fully trust the board with real hardware.

1. On your laptop, from the `GridPilot` repo root, run:
   ```
   python scripts/start_ocpp.py --mock
   ```
   This starts the OCPP server on port 9000 and the trigger API on port
   9001, plus spins up 5 *software* mock chargers so you can see the loop
   work even with zero ESP32 boards connected.
2. With the ESP32 flashed and powered on (same WiFi as the laptop), watch
   its serial monitor. You should see all 5 bays report
   `WebSocket connected`. This confirms WiFi + the laptop IP + firewall are
   all correct.

   > If you don't see "connected" within ~10-20 seconds, check
   > **Troubleshooting** below (most common cause: wrong `LAPTOP_IP`, or
   > Windows Firewall blocking the incoming connection).

3. In a second terminal, trigger a mode change:
   ```
   curl -X POST http://localhost:9001/mode -H "Content-Type: application/json" -d "{\"mode\": \"unmanaged\"}"
   ```
   Watch the ESP32's serial monitor — you should see `SetChargingProfile`
   log lines for each bay, and `-> ON`/`-> OFF` for each relay, matching
   what the real optimizer decided for the "worst" unmanaged timeslot.
4. Now try:
   ```
   curl -X POST http://localhost:9001/mode -H "Content-Type: application/json" -d "{\"mode\": \"managed\"}"
   ```
   You should see fewer bays turn ON — this is GridPilot's staggering.
5. You can also press the ESP32's physical BOOT button instead of `curl` —
   it does the same POST. Watch the laptop's terminal print the resulting
   per-bay results, and the ESP32's serial monitor react.

Once this loop works reliably with the mock backend, you can trust the OCPP
plumbing is correct, and any remaining issues are purely on the analog side
(relay wiring, INA219 readings, LCD).

---

## 7. Test with real hardware

1. Stop the `--mock` run (Ctrl+C) and start the real one:
   ```
   python scripts/start_ocpp.py
   ```
   (no `--mock` flag — this waits for real chargers, i.e. your ESP32's 5
   WebSocket connections, instead of spinning up software ones.)
2. Power on the rig. Confirm the same "5/5 connected" state on the LCD /
   serial monitor as in the mock test.
3. Trigger `unmanaged` mode (via `curl` or the BOOT button) — all 5 relays
   should click on, and the LCD should climb toward ~0.60A and show
   OVERLOAD (red LED).
4. Trigger `managed` mode — fewer relays should be on, current should stay
   under 0.54A, LCD shows SAFE (green LED).
5. Follow the "Night-Before Checklist" in
   [`hardware_demo_evaluation.md`](../../hardware_demo_evaluation.md) §8 —
   in particular, measure actual resistor values and adapter voltage under
   full 5-bay load with a multimeter, and cross-check the INA219 reading
   against the multimeter's reading in series, before the real demo.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails, error mentions a WebSockets/ArduinoJson/LiquidCrystal function | Library version mismatch | Check the exact error. `platformio.ini` pins compatible major versions (`WebSockets @ ^2.4.1`, `ArduinoJson @ ^7.0.4`) — if PlatformIO resolved a newer major version anyway, delete the `.pio` folder in this directory and rebuild, or pin the exact version shown in the error to what's in `lib_deps`. |
| ESP32 never prints "WiFi Connected" | Wrong SSID/password, or 5GHz-only WiFi | ESP32 only supports 2.4GHz WiFi — if your venue WiFi is 5GHz-only or "smart" dual-band without a 2.4GHz option, use a phone hotspot forced to 2.4GHz instead. |
| WiFi connects but bays never show "WebSocket connected" | Wrong `LAPTOP_IP`, laptop's firewall blocking port 9000, or venue WiFi has client/AP isolation | Re-run `ipconfig` to confirm the IP didn't change (it can, on some networks). Temporarily allow Python through Windows Defender Firewall (a prompt usually appears the first time you run `start_ocpp.py`). Try a hotspot if the venue WiFi isolates clients. |
| LCD backlight on, but no text | Wrong I2C address | Try `0x3F` instead of `0x27` in `main.cpp`'s `LiquidCrystal_I2C lcd(...)` line, or run an I2C scanner sketch (see §4b). |
| "INA219 Not found on I2C bus!" in serial monitor | Wiring or address issue | Check SDA/SCL aren't swapped, check the INA219 has power, check nothing else on the bus (like the LCD) is holding the bus low. |
| Relay behavior is inverted (ON when it should be OFF) | Active-high vs active-low mismatch | See §4g — flip `RELAY_ACTIVE_LOW` in `main.cpp` and re-flash. |
| Current reading is noisy / never reads exactly 0 with all bays off | Normal — small offset expected | The firmware auto-calibrates a baseline offset at boot (`calibrateCurrentOffset()`) and subtracts it. If it's still very noisy, check for a loose INA219 connection. |
| One bay never responds to SetChargingProfile | That bay's WebSocket dropped | Check serial monitor for `WebSocket disconnected` for that bay — `setReconnectInterval(3000)` should auto-reconnect within a few seconds; if it doesn't, check for a WiFi range/signal issue near that part of the rig. |

---

## 9. What's *not* guaranteed and why

Per the request that led to this firmware: I'm flagging explicitly what I'm
confident about vs. not, rather than presenting everything as equally
certain.

- **High confidence, verified against your actual backend code:** the OCPP-J
  message shapes (`SetChargingProfile` Call/CallResult), the WiFi/HTTPClient/
  Wire (I2C) calls — these are core ESP32 Arduino APIs that don't change.
- **Compiled successfully** — `pio run` was actually run against this exact
  `platformio.ini`/`main.cpp` (not just reasoned about): toolchain,
  `WebSocketsClient`, `ArduinoJson` v7, `LiquidCrystal_I2C`, and
  `Adafruit_INA219` all built clean (`[SUCCESS]`, RAM 15.1%, Flash 74.3%).
  One real bug this caught: the LCD library's PlatformIO registry ID is
  `marcoschwartz/LiquidCrystal_I2C`, not `johnrickman/LiquidCrystal_I2C` as
  originally guessed — already fixed in `platformio.ini`. A clean build
  confirms the code compiles; it does **not** confirm runtime behavior
  (WiFi actually connecting, WebSocket handshakes succeeding, relay
  polarity) — that's still §6/§7 below.
- **Explicitly not using MicroOCPP's own API**, despite the original ask —
  see the top comment in `main.cpp` for why (MicroOCPP is architected for
  one charge-point identity per firmware image; this rig's backend expects
  5 independent charge-point identities from one ESP32, which doesn't fit
  that library's design). What's implemented instead is the real OCPP-J
  wire protocol, hand-parsed for just the one message type this rig needs.
- **Cannot be known without your physical board:** exact GPIO-to-relay
  wiring and relay active-high/low polarity — §4f and §4g explain how to
  verify both yourself.
