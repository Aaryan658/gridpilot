import os

file_path = r'd:\GRID\frontend\src\app\dashboard\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#06141B",
        display: "flex",
      }}
    >
      <div
        style={{
          width: 240,
          background: "rgba(6,20,27,0.95)",'''

if target in content:
    start_idx = content.find(target)
    
    # We want to replace everything from `target` up to `<div style={{ flex: 1, padding: 24, overflowY: "auto" }}>`
    end_str = '      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>\n        <div style={{ marginBottom: 24 }}>'
    end_idx = content.find(end_str)
    
    if start_idx != -1 and end_idx != -1:
        new_header = '''  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 0, overflowY: "auto" }}>
        
        {/* Header with Run Schedule button */}
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
'''
        
        content = content[:start_idx] + new_header + content[end_idx + len(end_str):]
        
        # Remove ONE closing div from the end of the file
        footer = '''      </div>
    </div>
  );
}'''
        new_footer = '''    </div>
  );
}'''
        content = content.replace(footer, new_footer)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("SUCCESS")
    else:
        print("COULD NOT FIND END STR")
else:
    print("COULD NOT FIND TARGET STR")
