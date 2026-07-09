import os
file_path = r'd:\GRID\api\main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_origins = '''allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://gridpilot.in",
    "https://www.gridpilot.in",
    "https://gridpilot-frontend.onrender.com",
    settings.FRONTEND_URL,
]'''
new_origins = '''allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
    "https://gridpilot.in",
    "https://www.gridpilot.in",
    "https://gridpilot-frontend.onrender.com",
    settings.FRONTEND_URL,
]'''

if old_origins in content:
    content = content.replace(old_origins, new_origins)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED")
