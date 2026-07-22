#include <Wire.h>
#include <Adafruit_INA219.h>
#include <LiquidCrystal_I2C.h>

// Initialize hardware instances
Adafruit_INA219 ina219;
LiquidCrystal_I2C lcd(0x27, 16, 2); // Change 0x27 to 0x3F if LCD doesn't show text

// Corrected safe GPIO Pin assignments
const int RELAY_PINS[5] = {16, 17, 18, 19, 23}; 

unsigned long previousMillis = 0;
const long interval = 1000; // Refresh display every 1 second

void setup() {
  Serial.begin(115200);
  
  // Initialize Relay Pins as Outputs
  for(int i = 0; i < 5; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], LOW); // Default off (Assuming Active High relay)
  }

  // Initialize I2C Bus explicitly on ESP32 default pins
  Wire.begin(21, 22); 

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("System Loading...");

  // Initialize INA219
  if (!ina219.begin()) {
    Serial.println("Failed to find INA219 chip");
    lcd.clear();
    lcd.print("INA219 Error!");
    while (1) { delay(10); }
  }
  
  lcd.clear();
}

void loop() {
  unsigned long currentMillis = millis();

  // Non-blocking timer for sensor reads and LCD updates
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // Read values from INA219
    float shuntvoltage = ina219.getShuntVoltage_mV();
    float busvoltage = ina219.getBusVoltage_V();
    float current_mA = ina219.getCurrent_mA();
    float power_mW = ina219.getPower_mW();
    float loadvoltage = busvoltage + (shuntvoltage / 1000);

    // Print data to Serial Monitor for debugging
    Serial.print("Load Voltage: "); Serial.print(loadvoltage); Serial.println(" V");
    Serial.print("Current:      "); Serial.print(current_mA); Serial.println(" mA");
    
    // Update the 16x2 LCD Display
    lcd.clear();
    
    // Line 1: Voltage
    lcd.setCursor(0, 0);
    lcd.print("Volt: ");
    lcd.print(loadvoltage, 2);
    lcd.print(" V");

    // Line 2: Current
    lcd.setCursor(0, 1);
    lcd.print("Curr: ");
    lcd.print(current_mA, 1);
    lcd.print(" mA");
  }

  // Your automation/switching logic for relays goes here
  // Example: digitalWrite(RELAY_PINS[0], HIGH);
}
