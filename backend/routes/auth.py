"""
Authentication routes
"""
from fastapi import APIRouter, HTTPException, Depends
import bcrypt

from database import db
from auth import create_access_token, get_current_user
from models import UserRegister, UserLogin, User, UserRole

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(user_data: UserRegister):
    existing = await db.usuarios.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    hashed_password = bcrypt.hashpw(user_data.senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user = User(
        id=str(__import__('uuid').uuid4()),
        nome=user_data.nome,
        email=user_data.email,
        role=user_data.role
    )
    
    doc = user.model_dump()
    doc['senha'] = hashed_password
    await db.usuarios.insert_one(doc)
    
    return {"message": "Usuário criado com sucesso", "user": user}


@router.post("/login")
async def login(credentials: UserLogin):
    user = await db.usuarios.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not bcrypt.checkpw(credentials.senha.encode('utf-8'), user['senha'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_access_token({"sub": user['id'], "email": user['email']})
    return {"token": token, "user": {"id": user['id'], "nome": user['nome'], "email": user['email'], "role": user['role']}}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
