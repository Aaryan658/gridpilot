# GridPilot — Ideathon 2026 Hardware Demo

## Locked Parameters

| Parameter | Value |
|---|---|
| Fleet size (dashboard) | 40 vehicles (mixed Vahan CY2025 fleet, 3.3-7.4 kW chargers) |
| Rig model | **1:1 — 5 physical bays run their own live 5-vehicle GridPilotScheduler instance**, not a scaled slice of the 40-vehicle dashboard run (see `ocpp_mock/gridpilot_bridge.py`) |
| CEA grid intensity | 710 gCO₂/kWh (0.710 kg CO₂/kWh) |
| Transformer limit | 270 kW (real, 40-vehicle dashboard figure) |
| Managed target | 135 kW (40-vehicle dashboard figure) |
| Optimizer | CVXPY/CLARABEL, 3,840 decision variables (dashboard) / 480 (rig's 5-vehicle run) |
| Backend | FastAPI on Render |

> **Note:** the dashboard's flagship fleet was rescaled from 600 → 40 vehicles. The
> transformer/target limits were rescaled by the same ~15x factor (4,000→270 kW,
> 2,000→135 kW). The physical rig does **not** inherit these 40-vehicle figures by
> scaling them down 1:8 — it runs the identical optimizer fresh, for exactly 5
> vehicles, with its own proportionally-scaled transformer/DVVNL limits
> (`n_vehicles_for_capacity=5`). Two independent, truthful runs of the same
> software, not one number stretched to cover both.

---

## 1. Bill of Materials

### Already Built / On Board

| # | Component | Spec | Qty | Notes |
|---|---|---|---|---|
| 1 | ESP32 dev board | WiFi, GPIO, ADC, I2C | 1 | Needs relabeling (see §2) |
| 2 | Relay modules | 5V, individually switched | 5 | Working — heat-shrink terminals before demo |
| 3 | Transformer prop | Aluminum heatsink (visual only) | 1 | No live mains — purely decorative |

### Need to Buy

| # | Component | Spec | Qty | Est. Cost | Why You Need It |
|---|---|---|---|---|---|
| 4 | **12V DC adapter** | **12V 5A (60W)**, enclosed, regulated | 1 | ₹300–400 | A 3A adapter runs at 95% capacity with 5 bays → voltage sags → false readings. 5A gives 57% load = no sag. |
| 5 | **Power resistors** | 100Ω (0.12A/bay, 1.44W dissipated — well under a 5W or 25W part's rating) | 5 | ₹30–40 each | Each bay's load. |
| 5b | **LED current-limiting resistors** | 1kΩ, separate branch from the load path | 5 | ₹5 each | Sets LED indicator brightness/current only — doesn't affect the INA219 load-current reading. |
| 6 | **INA219 Current Sensor** | **I2C interface**, 3.2A range | 1 | ₹80–150 | Digital current sensor. Replaces noisy ACS712. Completely bypasses ESP32's non-linear ADC and doesn't need a voltage divider or capacitor. |
| 7 | **16×2 LCD display** | I2C backpack **pre-soldered** | 1 | ₹200 | Shows live current, bay count, grid intensity, scale context. Must be I2C version (not raw HD44780) — saves 4 GPIO pins. |
| 8 | **3A or 5A blade fuse + holder** | Inline, automotive style | 1 | ₹10–20 | Protects against wire shorts on the 12V bus. Without it, a short melts wire insulation before the adapter current-limits. Use 3A for 5W loads, 5A for 10W loads. |
| 9 | **EV connector mockups** | DC pigtail plug shells (visual) | 5 | ₹159/pack of 10 | Visual realism for the 5 bays. WIRESLAB pack on Amazon. |
| 10 | **18650 Li-ion cells** | 3.7V, 2200mAh | 5 | ₹116–127 each | **⚠️ See safety note below.** If purely decorative, replace with 3D-printed dummies. If powering ESP32, use a buck converter from the 12V adapter instead. |
| 11 | **Buck converter** (if needed) | 12V → 5V, 1A | 1 | ₹50 | Powers ESP32 from the 12V rail safely. Only needed if you're not powering ESP32 via USB separately. |

> [!CAUTION]
> **Item 10 — 18650 cells**: Exposed lithium cells at a public event can trigger organizer/judge intervention regardless of wiring. If they're decorative (representing vehicle batteries), swap them for clearly labeled dummies. If they power the ESP32, use item 11 (buck converter from 12V adapter) instead.

---

## 2. Board Fixes Before Demo

These are things already on the board that need correcting:

| What | Current State | Fix To |
|---|---|---|
| ESP32 label | "GridPilot Controller" | **"OCPP Dispatch Node"** — the optimizer runs on Render, not on the ESP32 |
| LCD CO₂ display | 62 gCO₂/kWh | **710 gCO₂/kWh** |
| Scale context | Not shown | Add label: **"5 bays = live 5-vehicle GridPilot run (1:1)"** |
| LED behavior | Appears hardcoded | Must be driven by **real INA219 readings** vs. threshold — pulling a resistor wire must change LED state |
| Relay terminals | Exposed contacts | **Heat-shrink or hot-glue** all output terminals |
| Resistor/Bulb area | No warning | Add **"⚠️ HOT SURFACE"** label near load elements |

---

## 3. How the Rig Relates to the Software (1:1, Not Scaled)

The rig does not try to reproduce the dashboard's 40-vehicle kW figures in amps —
it runs its own live 5-vehicle optimization (`ocpp_mock/gridpilot_bridge.py`) and
each bay's ON/OFF state comes straight from that run's real per-vehicle power
schedule. The 12V/100Ω current draw below is only there to prove closed-loop
physical feedback (relay switches → sensor confirms it) — it is not an electrical
stand-in for the vehicles' actual 7.4kW charger draw, which a 12V DC bench supply
was never meant to reproduce.

### Current at Each Bay Count (With 100Ω Resistors)

> **Updated from the original 22Ω spec** — actual build uses 100Ω load
> resistors (plus a separate 1kΩ current-limiting resistor per LED, not in
> the load path). Threshold recalibrated below to preserve the same "5 ON
> overloads, 4 ON is safe" demo story at the new, much lower currents.

| Bays ON | Current (12V / 100Ω) | Demo State |
|---|---|---|
| 5 (unmanaged) | **0.60 A** | 🔴 OVERLOAD |
| 4 | **0.48 A** | 🟢 SAFE |
| 3 | **0.36 A** | 🟢 SAFE |
| 2 | **0.24 A** | 🟢 SAFE |
| 1 | **0.12 A** | 🟢 SAFE |

> **Superseded — kept for history only:** an earlier draft of this doc scaled a
> 12V/10W-bulb current ×8 to claim direct kW-equivalence with the 40-vehicle
> dashboard figures (400kW, 320kW, etc.). That table has been dropped — it
> implied a 1:8 electrical scale-up this rig does not do. The 100Ω table above,
> with its threshold picked directly from measured currents, is the actual build.

### Threshold: 0.54A (100Ω Resistors)

**Why 0.54A?** With 100Ω resistors, 5 bays draw 0.60A and 4 bays draw 0.48A — the transformer-derating math (270kW ÷ 8 ÷ 12V × 85%) no longer applies at these much lower currents, so the threshold is set directly between those two values instead: high enough that 1-4 bays never trip it, low enough that the 5th bay (all vehicles charging unmanaged) does.

| Measured Current | State | LED |
|---|---|---|
| < 0.45 A | SAFE | 🟢 Green |
| 0.45 – 0.54 A | WARNING | 🟡 Yellow |
| > 0.54 A | OVERLOAD | 🔴 Red |

**Demo flow:** 
1. **Unmanaged mode:** All 5 relays ON → exceeds threshold → OVERLOAD (Red LED + LCD alarm).
2. **GridPilot mode:** Toggled via BOOT button. Render backend schedule staggers relays (max 3 or 4 ON) → current stays below threshold → SAFE (Green LED + LCD normal).

---

## 4. Firmware Guide

### Library Stack

| Function | Library |
|---|---|
| OCPP 1.6J | **MicroOCPP** (matth-x/MicroOcpp) |
| LCD | **LiquidCrystal_I2C** |
| Sensor | **Adafruit_INA219** |

### Main Loop

```cpp
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_INA219.h>
#include <MicroOcpp.h>

Adafruit_INA219 ina219;
LiquidCrystal_I2C lcd(0x27, 16, 2);

enum Mode { UNMANAGED, GRIDPILOT };
Mode currentMode = UNMANAGED;
bool modeChanged = true;

void IRAM_ATTR onButtonPress() {
    currentMode = (currentMode == UNMANAGED) ? GRIDPILOT : UNMANAGED;
    modeChanged = true;
}

void setup() {
    Serial.begin(115200);
    
    // BOOT button on ESP32 is GPIO 0
    pinMode(0, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(0), onButtonPress, FALLING);
    
    ina219.begin();
    lcd.init();
    lcd.backlight();
    
    // Initialize MicroOCPP here...
}

void loop() {
    microOcpp.loop();

    if (modeChanged) {
        if (currentMode == UNMANAGED) {
            for (int i = 0; i < 5; i++) digitalWrite(relayPins[i], HIGH);
        } else {
            // Apply staggered schedule received from OCPP profile
            applyGridPilotSchedule();
        }
        modeChanged = false;
    }

    if (millis() - lastRead > 200) {
        float current_A = ina219.getCurrent_mA() / 1000.0;
        float voltage_V = ina219.getBusVoltage_V();
        
        updateLEDs(current_A);
        updateLCD(current_A, voltage_V, currentMode);
        lastRead = millis();
    }
}
```

### Key Firmware Rules

1. **Use `ws://` not `wss://`** — saves ~50 KB RAM on ESP32, no security needed on private demo WiFi.
2. **Stagger relay switching** — never switch more than 1 relay per 100ms.
3. **Calibrate offset at startup** — read current with all relays off, save as offset value, subtract from future reads.

---

## 5. What Can Go Wrong (Failure Modes)

| # | Failure | Risk | What Happens | How to Prevent |
|---|---|---|---|---|
| 1 | **12V adapter sags under load** | 🔴 High | Voltage drops to 11V → 5-bay current falls below threshold → overload not triggered | **5A adapter (BOM item 4)** — mandatory |
| 2 | **Resistor/Bulb gets too hot** | 🔴 High | Burns fingers, melts plastic baseboard | Mount on aluminum standoffs + warning label |
| 3 | **WiFi disconnects mid-demo** | 🟡 Medium | Relays freeze in last state, LCD hangs | Add automatic reconnect routine in setup/loop |
| 4 | **Short-circuit on power bus** | 🟡 Medium | Board traces burn, adapter gets damaged | **Blade fuse (BOM item 8)** — mandatory |
| 5 | **Exposed Lithium cells** | 🔴 High | Disqualification by safety marshals at venue | Remove 18650s or use dummies |

---

## 6. Safety Checklist

| # | Item | Done? |
|---|---|---|
| 1 | No mains AC anywhere on board — 12V DC only | ✅ |
| 2 | 3A/5A fuse inline on +12V rail | ⬜ |
| 3 | 18650 cells removed or dummy-replaced | ⬜ |
| 4 | Relay output terminals heat-shrunk / hot-glued | ⬜ |
| 5 | Power resistors/bulbs labeled "HOT SURFACE" | ⬜ |
| 6 | ESP32 powered via USB or buck converter (not raw 12V to Vin) | ⬜ |

---

## 7. Judge Q&A Defense

| They Ask | You Say |
|---|---|
| "Why only 5 bays?" | "1:1 — it's its own live 5-vehicle GridPilotScheduler run, not a slice of the 40-vehicle dashboard. The same optimizer that drives the 40-vehicle dashboard (3,840 decision variables) runs a separate 480-variable instance for these 5 bays. ESP32 is just an actuation endpoint receiving OCPP commands from that run." |
| "Isn't this just 5 LEDs?" | "No — INA219 measures real current through real loads switched by real relays. Disconnect a wire, the current drop displays instantly. It's closed-loop physical feedback." |
| "How does this prove the optimizer works?" | "Unmanaged: 5 relays on, current exceeds limit, LCD shows OVERLOAD. Optimizer: staggers bays, keeps total current below threshold, LCD shows SAFE. Software logic solving a physical constraint." |
| "Why 0.54A?" | "With 100Ω resistors, 4 bays draw 0.48A and 5 bays draw 0.60A — the threshold sits between them, so the 5th vehicle charging unmanaged is exactly what trips it." |
| "What's the CO₂ number?" | "710 gCO₂/kWh — CEA v21 weighted average for the NCR grid." |

---

## 8. Night-Before Checklist

### Hardware Validation
- [ ] Measure each load resistor/bulb resistance → calculate expected current steps
- [ ] Measure adapter voltage under full load (5 bays) → must be ≥ 11.8V
- [ ] Verify INA219 readings against a multimeter in series

### Functional Test
- [ ] Run unmanaged → managed transition **10 times** — verify no false states
- [ ] Pull a wire mid-run → confirm LCD current drops and LED status updates instantly
- [ ] Test router power cycle → ESP32 must reconnect and resume within 15 seconds

---

## 9. Should the 5 Bays Use Real 9V Batteries Instead of Resistors?

**Short answer: no — keep the 100Ω resistors as the electrical load. Use real 9V batteries only as a visual prop next to each bay, not wired into the current path.**

### Why not wire a relay straight to a rechargeable 9V pack

- **No current limiting.** The 100Ω resistor is what makes bay current predictable (0.12A/bay, the whole §3 table depends on it). A rechargeable 9V pack (NiMH ~7.2-8.4V nominal, or a protected Li-ion equivalent) has internal resistance of a fraction of an ohm — a bare relay across 12V into that pack with nothing else in the path pulls far more current than the adapter, wiring, and battery are rated for. That's an overheating/venting/fire risk, not a demo tweak.
- **Ordinary alkaline 9V batteries are not rechargeable at all.** Forcing current into one risks rupture or leakage. Only use a battery explicitly rated NiMH-rechargeable or a protected Li-ion "9V" pack — never a standard Duracell/Eveready-style alkaline block.
- **It breaks the current-scaling math.** Battery charge current isn't fixed like a resistor's — it depends on state of charge and battery chemistry, so the current table in §3 (and the 0.54A OVERLOAD threshold) would no longer be a reliable, repeatable number.
- **Same safety category the doc already flags for the 18650 cells** (§1, item 10, §5 failure mode 5): exposed rechargeable cells with no protection circuit are a judge/safety-marshal disqualification risk at a public event.

### Recommended option: batteries as decoration, resistors as the load

Mount a 9V battery (any kind, doesn't need to be functional) visually beside/on top of each bay's resistor, not electrically connected to the relay circuit. This gets the "it's charging a battery" visual without touching the proven-safe resistor current path — zero rewiring, zero added risk, zero cost beyond 5 cheap 9V shells.

### If you actually want to charge real 9V rechargeables

Only do this with a dedicated current-limiting charge circuit per bay — e.g. a small constant-current module (an LM317 CC circuit or an off-the-shelf single-cell NiMH charge board) set to a safe trickle rate (~50-100 mA for a small 9V NiMH block), wired in series between the relay and the battery, plus a hard-backstop series resistor. This means: 5 extra charge-control modules (cost + one more thing that can fail live), and the entire §3 current table would need to be recomputed around whatever current the charge modules are set to, not 0.60A. Given the short prep window before the demo, the decorative-battery approach above is the lower-risk choice.
