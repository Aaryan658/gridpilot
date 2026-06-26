from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database.models import SessionLocal
from api.models.user import User
from api.auth.utils import decode_token
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    print(f"DEBUG: get_current_user called with token: {token[:15]}...")
    try:
        payload = decode_token(token)
    except Exception as e:
        print(f"DEBUG: decode_token failed: {e}")
        raise
    email: str = payload.get("sub")
    if email is None:
        print("DEBUG: email is None")
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        print(f"DEBUG: User not found for email: {email}")
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Inactive user")
    
    return user

def require_depot_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["depot_admin", "gridpilot_admin"]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return current_user

def require_gridpilot_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "gridpilot_admin":
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return current_user

def optional_current_user(token: Optional[str] = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)) -> Optional[User]:
    """Returns the authenticated user if a valid token is provided, otherwise None.
    This allows endpoints to work for both logged-in and anonymous users."""
    if not token:
        return None
    try:
        payload = decode_token(token)
        email: str = payload.get("sub")
        if email is None:
            return None
        user = db.query(User).filter(User.email == email).first()
        return user if user and user.is_active else None
    except Exception:
        return None


def get_depot_id(current_user: User = Depends(get_current_user), depot_id: str = None) -> str:
    if current_user.role == "gridpilot_admin":
        if not depot_id:
            raise HTTPException(status_code=400, detail="depot_id query parameter is required for gridpilot_admin")
        return depot_id
    
    return current_user.depot_id
