import os

file_path = r'd:\GRID\frontend\src\app\dashboard\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add the useAuth import
if "import { useAuth } from" not in content:
    content = content.replace('import { useEffect, useState, useRef } from "react";', 
                              'import { useEffect, useState, useRef } from "react";\nimport { useAuth } from "@/context/AuthContext";')

# Inject isAdmin check at the top of the component
if "const isAdmin = user?.role ===" not in content:
    content = content.replace('export default function DashboardPage() {',
                              'export default function DashboardPage() {\n  const { user } = useAuth();\n  const isAdmin = user?.role === "gridpilot_admin";')

# Wrap the sidebar in {!isAdmin && ( ... )}
sidebar_start = '''      <div
        style={{
          width: 240,
          background: "rgba(6,20,27,0.95)",'''
sidebar_end = '''            <span style={{ fontSize: 10, color: "#4A5C6A" }}>
              {isLive ? "Live API connected" : "Demo mode"}
            </span>
          </div>
        </div>
      </div>'''

# First, let's locate the exact bounds
start_idx = content.find(sidebar_start)
end_idx = content.find(sidebar_end)

if start_idx != -1 and end_idx != -1:
    end_idx += len(sidebar_end)
    original_sidebar = content[start_idx:end_idx]
    
    # We replace the original sidebar with a ternary/conditional wrapper
    new_sidebar = "{!isAdmin && (\n" + original_sidebar + "\n      )}"
    content = content[:start_idx] + new_sidebar + content[end_idx:]
    
    # We also want to adjust the padding of the main content area depending on isAdmin so it looks perfect
    content = content.replace('<div style={{ flex: 1, padding: 24, overflowY: "auto" }}>',
                              '<div style={{ flex: 1, padding: isAdmin ? 0 : 24, overflowY: "auto" }}>')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("COULD NOT FIND SIDEBAR BOUNDS")
