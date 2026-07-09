import os

file_path = r'd:\GRID\frontend\src\app\dashboard\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

button_code = """
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#CCD0CF", marginBottom: 4 }}>
              Depot Dashboard
            </h1>
            <p style={{ fontSize: 12, color: "#4A5C6A" }}>
              Corporate EV Fleet Depot, Gurugram
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 6, height: 6,
                borderRadius: "50%",
                background: isLive ? "#27AE60" : "#F9CA24",
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: "#4A5C6A", fontWeight: 600 }}>
                {isLive ? "Live API Connected" : "Demo Mode"}
              </span>
            </div>
            <button
              onClick={handleRunSchedule}
              disabled={solving}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background: solving ? "#253745" : "#00C851",
                color: "white",
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: solving ? "not-allowed" : "pointer",
                boxShadow: solving ? "none" : "0 4px 12px rgba(0,200,81,0.3)",
                transition: "all 0.2s",
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {solving ? "Solving..." : solved ? "▶ Run Again" : "▶ Run Schedule"}
            </button>
          </div>
        </div>
"""

# Replace the original header with the new header containing the button
original_header = """
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#CCD0CF", marginBottom: 4 }}>
            Depot Dashboard
          </h1>
          <p style={{ fontSize: 12, color: "#4A5C6A" }}>
            Corporate EV Fleet Depot, Gurugram
          </p>
        </div>
"""

if original_header in content:
    content = content.replace(original_header, button_code)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED TO FIND ORIGINAL HEADER")
