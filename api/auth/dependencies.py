from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database.models import SessionLocal
from api.models.user import User
from api.auth.utils import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
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

def get_depot_id(current_user: User = Depends(get_current_user), depot_id: str = None) -> str:
    if current_user.role == "gridpilot_admin":
        if not depot_id:
            raise HTTPException(status_code=400, detail="depot_id query parameter is required for gridpilot_admin")
        return depot_id
    
    return current_user.depot_id
