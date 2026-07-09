import os

file_path = r'd:\GRID\api\auth\utils.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '    except JWTError:'
replacement = '''    except JWTError as e:
        print(f"JWT decode error: {e}")
        print(f"Token received: {token}")'''

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED")
