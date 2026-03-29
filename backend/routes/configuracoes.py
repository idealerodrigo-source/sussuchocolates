"""
Configurações routes - Usuários e Empresa
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import bcrypt
import base64
import os

from database import db
from auth import get_current_user
from models import UserRole

router = APIRouter(prefix="/configuracoes", tags=["configuracoes"])


# Models para Usuários
class UsuarioCreate(BaseModel):
    nome: str
    email: str
    senha: str
    role: str = "vendedor"
    ativo: bool = True


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    senha: Optional[str] = None
    role: Optional[str] = None
    ativo: Optional[bool] = None


# Models para Empresa
class EmpresaUpdate(BaseModel):
    nome: Optional[str] = None
    razao_social: Optional[str] = None
    cnpj: Optional[str] = None
    ie: Optional[str] = None
    endereco: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None


# ========== USUÁRIOS ==========

@router.get("/usuarios")
async def listar_usuarios(current_user: dict = Depends(get_current_user)):
    """Lista todos os usuários (apenas admin)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem acessar esta função")
    
    usuarios = await db.usuarios.find({}, {"_id": 0, "senha": 0}).to_list(100)
    return usuarios


@router.post("/usuarios")
async def criar_usuario(usuario: UsuarioCreate, current_user: dict = Depends(get_current_user)):
    """Cria um novo usuário (apenas admin)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar usuários")
    
    # Verificar se email já existe
    existing = await db.usuarios.find_one({"email": usuario.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Hash da senha
    hashed_password = bcrypt.hashpw(usuario.senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    novo_usuario = {
        "id": str(uuid.uuid4()),
        "nome": usuario.nome,
        "email": usuario.email,
        "senha": hashed_password,
        "role": usuario.role,
        "ativo": usuario.ativo,
        "data_cadastro": datetime.now(timezone.utc).isoformat()
    }
    
    await db.usuarios.insert_one(novo_usuario)
    
    # Retornar sem a senha e sem _id do MongoDB
    del novo_usuario["senha"]
    if "_id" in novo_usuario:
        del novo_usuario["_id"]
    return {"message": "Usuário criado com sucesso", "usuario": novo_usuario}


@router.put("/usuarios/{usuario_id}")
async def atualizar_usuario(usuario_id: str, usuario: UsuarioUpdate, current_user: dict = Depends(get_current_user)):
    """Atualiza um usuário (apenas admin)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem atualizar usuários")
    
    existing = await db.usuarios.find_one({"id": usuario_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    update_data = {}
    if usuario.nome:
        update_data["nome"] = usuario.nome
    if usuario.email:
        # Verificar se email já existe em outro usuário
        email_exists = await db.usuarios.find_one({"email": usuario.email, "id": {"$ne": usuario_id}}, {"_id": 0})
        if email_exists:
            raise HTTPException(status_code=400, detail="Email já cadastrado para outro usuário")
        update_data["email"] = usuario.email
    if usuario.senha:
        update_data["senha"] = bcrypt.hashpw(usuario.senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    if usuario.role:
        update_data["role"] = usuario.role
    if usuario.ativo is not None:
        update_data["ativo"] = usuario.ativo
    
    if update_data:
        await db.usuarios.update_one({"id": usuario_id}, {"$set": update_data})
    
    return {"message": "Usuário atualizado com sucesso"}


@router.delete("/usuarios/{usuario_id}")
async def deletar_usuario(usuario_id: str, current_user: dict = Depends(get_current_user)):
    """Deleta um usuário (apenas admin)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar usuários")
    
    # Não permitir deletar a si mesmo
    if current_user.get('id') == usuario_id:
        raise HTTPException(status_code=400, detail="Você não pode deletar seu próprio usuário")
    
    result = await db.usuarios.delete_one({"id": usuario_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return {"message": "Usuário deletado com sucesso"}


# ========== EMPRESA ==========

@router.get("/empresa")
async def obter_empresa(current_user: dict = Depends(get_current_user)):
    """Obtém os dados da empresa"""
    empresa = await db.empresa.find_one({}, {"_id": 0})
    
    if not empresa:
        # Criar registro padrão da empresa
        empresa = {
            "id": "empresa_principal",
            "nome": "Sussu Chocolates",
            "razao_social": "Sussu Chocolates LTDA",
            "cnpj": "09.328.682/0001-30",
            "ie": "",
            "endereco": "",
            "numero": "",
            "complemento": "",
            "bairro": "",
            "cidade": "Jacarezinho",
            "estado": "PR",
            "cep": "",
            "telefone": "",
            "email": "",
            "website": "",
            "logo": None,
            "data_cadastro": datetime.now(timezone.utc).isoformat()
        }
        await db.empresa.insert_one(empresa)
    
    return empresa


@router.put("/empresa")
async def atualizar_empresa(empresa_data: EmpresaUpdate, current_user: dict = Depends(get_current_user)):
    """Atualiza os dados da empresa (apenas admin)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem atualizar dados da empresa")
    
    update_data = {k: v for k, v in empresa_data.model_dump().items() if v is not None}
    
    if update_data:
        await db.empresa.update_one({}, {"$set": update_data}, upsert=True)
    
    return {"message": "Dados da empresa atualizados com sucesso"}


@router.post("/empresa/logo")
async def upload_logo(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload do logo da empresa (apenas admin)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem alterar o logo")
    
    # Verificar tipo de arquivo
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido. Use JPEG, PNG, GIF ou WebP.")
    
    # Ler o arquivo e converter para base64
    contents = await file.read()
    
    # Limitar tamanho (max 2MB)
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo 2MB.")
    
    # Converter para base64
    logo_base64 = base64.b64encode(contents).decode('utf-8')
    logo_data = f"data:{file.content_type};base64,{logo_base64}"
    
    # Salvar no banco
    await db.empresa.update_one({}, {"$set": {"logo": logo_data}}, upsert=True)
    
    return {"message": "Logo atualizado com sucesso", "logo": logo_data}


@router.delete("/empresa/logo")
async def remover_logo(current_user: dict = Depends(get_current_user)):
    """Remove o logo da empresa (apenas admin)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem remover o logo")
    
    await db.empresa.update_one({}, {"$set": {"logo": None}})
    
    return {"message": "Logo removido com sucesso"}
