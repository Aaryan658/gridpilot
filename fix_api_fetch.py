import os

file_path = r'd:\GRID\frontend\src\lib\api.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }'''

replacement = '''export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string
) {
  let authStr = token;
  if (!authStr && typeof window !== 'undefined') {
    authStr = localStorage.getItem('gridpilot_token') || undefined;
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(authStr && { Authorization: `Bearer ${authStr}` }),
    ...options.headers,
  }'''

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED TO PATCH API FETCH")
