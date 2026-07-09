import os

# 1. Update AuthContext.tsx
auth_path = r'd:\GRID\frontend\src\context\AuthContext.tsx'
with open(auth_path, 'r', encoding='utf-8') as f:
    auth_content = f.read()

if 'viewAsAdmin: boolean' not in auth_content:
    auth_content = auth_content.replace(
        '  logout: () => void\n}',
        '  logout: () => void\n  viewAsAdmin: boolean\n  setViewAsAdmin: (val: boolean) => void\n}'
    )
    auth_content = auth_content.replace(
        'const [isLoading, setIsLoading] = useState(true)',
        'const [isLoading, setIsLoading] = useState(true)\n  const [viewAsAdmin, setViewAsAdmin] = useState(true)'
    )
    auth_content = auth_content.replace(
        'value={{ user, token, isLoading, login, logout }}',
        'value={{ user, token, isLoading, login, logout, viewAsAdmin, setViewAsAdmin }}'
    )
    with open(auth_path, 'w', encoding='utf-8') as f:
        f.write(auth_content)

# 2. Update layout.tsx
layout_path = r'd:\GRID\frontend\src\app\dashboard\layout.tsx'
with open(layout_path, 'r', encoding='utf-8') as f:
    layout_content = f.read()

layout_content = layout_content.replace(
    'const { user, logout, isLoading } = useAuth()',
    'const { user, logout, isLoading, viewAsAdmin, setViewAsAdmin } = useAuth()'
)
layout_content = layout_content.replace(
    'const isAdmin = user?.role === \'gridpilot_admin\';',
    'const isAdmin = user?.role === \'gridpilot_admin\' && viewAsAdmin;'
)
layout_content = layout_content.replace(
    '{user.email}\n              </div>',
    '''{user.email}
              </div>
              <button
                onClick={() => setViewAsAdmin(false)}
                className="ml-4 px-3 py-1.5 bg-[#7C5CBF] hover:bg-[#6A4E9E] rounded-lg text-xs font-semibold transition-colors"
              >
                View as Depot Mode
              </button>'''
)
with open(layout_path, 'w', encoding='utf-8') as f:
    f.write(layout_content)

# 3. Update page.tsx
page_path = r'd:\GRID\frontend\src\app\dashboard\page.tsx'
with open(page_path, 'r', encoding='utf-8') as f:
    page_content = f.read()

page_content = page_content.replace(
    'const { user } = useAuth();',
    'const { user, viewAsAdmin, setViewAsAdmin } = useAuth();'
)
page_content = page_content.replace(
    'const isAdmin = user?.role === "gridpilot_admin";',
    'const isAdmin = user?.role === "gridpilot_admin" && viewAsAdmin;'
)
button_code = '''
        <div style={{ flex: 1 }} />
        
        {user?.role === "gridpilot_admin" && !isAdmin && (
          <button
            onClick={() => setViewAsAdmin(true)}
            style={{
              marginBottom: 16,
              background: "#7C5CBF",
              color: "#fff",
              border: "none",
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(124,92,191,0.3)",
              transition: "all 0.2s",
            }}
          >
            Switch to Admin View
          </button>
        )}
'''
# inject button right above Run Schedule button in the old sidebar
if '        <div style={{ flex: 1 }} />' in page_content:
    page_content = page_content.replace(
        '        <div style={{ flex: 1 }} />',
        button_code
    )

with open(page_path, 'w', encoding='utf-8') as f:
    f.write(page_content)

print("SUCCESS")
