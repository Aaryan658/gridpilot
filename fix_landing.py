import os

file_path = r'd:\GRID\frontend\src\app\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Admin Login button next to Live Dashboard button
old_button = '''          <a
            href="/dashboard"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#9BA8AB",
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid rgba(74,92,106,0.3)",
              transition: "all 0.15s",
            }}
          >
            Live Dashboard →
          </a>'''

new_button = '''          <a
            href="/login"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#7C5CBF",
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid rgba(124,92,191,0.3)",
              background: "rgba(124,92,191,0.1)",
              transition: "all 0.15s",
            }}
          >
            Admin Login
          </a>
          <a
            href="/dashboard"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#9BA8AB",
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid rgba(74,92,106,0.3)",
              transition: "all 0.15s",
            }}
          >
            Live Dashboard →
          </a>'''

if old_button in content:
    content = content.replace(old_button, new_button)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("COULD NOT FIND BUTTON")
