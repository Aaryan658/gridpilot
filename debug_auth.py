import os

file_path = r'd:\GRID\api\auth\dependencies.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")'''

replacement = '''def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    print(f"DEBUG: get_current_user called with token: {token[:15]}...")
    try:
        payload = decode_token(token)
    except Exception as e:
        print(f"DEBUG: decode_token failed: {e}")
        raise
    email: str = payload.get("sub")
    if email is None:
        print("DEBUG: email is None")
        raise HTTPException(status_code=401, detail="Could not validate credentials")'''

if target in content:
    content = content.replace(target, replacement)
    
    target2 = '''    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")'''
        
    replacement2 = '''    user = db.query(User).filter(User.email == email).first()
    if user is None:
        print(f"DEBUG: User not found for email: {email}")
        raise HTTPException(status_code=401, detail="User not found")'''
        
    content = content.replace(target2, replacement2)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED TO PATCH DEPENDENCIES")
