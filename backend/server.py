from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Sussu Chocolates API")
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ.get('JWT_SECRET', 'sussu-chocolates-secret-key-2026')
JWT_ALGORITHM = "HS256"
security = HTTPBearer()

class UserRole(str, Enum):
    ADMIN = "admin"
    VENDEDOR = "vendedor"
    PRODUCAO = "producao"

class PedidoStatus(str, Enum):
    PENDENTE = "pendente"
    EM_PRODUCAO = "em_producao"
    EM_EMBALAGEM = "em_embalagem"
    CONCLUIDO = "concluido"
    ENTREGUE = "entregue"

class MovimentoEstoque(str, Enum):
    ENTRADA = "entrada"
    SAIDA = "saida"
    AJUSTE = "ajuste"

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.usuarios.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

class UserRegister(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    role: UserRole = UserRole.VENDEDOR

class UserLogin(BaseModel):
    email: EmailStr
    senha: str

class User(BaseModel):
    id: str
    nome: str
    email: EmailStr
    role: UserRole
    created_at: datetime

class Cliente(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    cpf: Optional[str] = None
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClienteCreate(BaseModel):
    nome: str
    cpf: Optional[str] = None
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None

class Produto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    descricao: Optional[str] = None
    categoria: str
    preco: float
    custo_producao: Optional[float] = None
    ncm_code: str = "18063210"
    unidade: str = "UN"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProdutoCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    categoria: str
    preco: float
    custo_producao: Optional[float] = None
    ncm_code: str = "18063210"
    unidade: str = "UN"

class ItemPedido(BaseModel):
    produto_id: str
    produto_nome: str
    quantidade: float
    preco_unitario: float
    subtotal: float

class Pedido(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str
    cliente_id: str
    cliente_nome: str
    items: List[ItemPedido]
    valor_total: float
    status: PedidoStatus = PedidoStatus.PENDENTE
    data_pedido: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_entrega: Optional[datetime] = None
    observacoes: Optional[str] = None

class PedidoCreate(BaseModel):
    cliente_id: str
    items: List[ItemPedido]
    observacoes: Optional[str] = None
    data_entrega: Optional[str] = None

class Producao(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pedido_id: str
    pedido_numero: str
    produto_id: str
    produto_nome: str
    quantidade: float
    data_inicio: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_conclusao: Optional[datetime] = None
    responsavel: Optional[str] = None
    observacoes: Optional[str] = None

class ProducaoCreate(BaseModel):
    pedido_id: str
    produto_id: str
    quantidade: float
    responsavel: Optional[str] = None
    observacoes: Optional[str] = None

class Embalagem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    producao_id: str
    pedido_id: str
    produto_nome: str
    quantidade: float
    data_embalagem: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    responsavel: Optional[str] = None
    tipo_embalagem: Optional[str] = None

class EmbalagemCreate(BaseModel):
    producao_id: str
    pedido_id: str
    quantidade: float
    responsavel: Optional[str] = None
    tipo_embalagem: Optional[str] = None

class Estoque(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    produto_id: str
    produto_nome: str
    quantidade: float
    tipo_movimento: MovimentoEstoque
    data_movimento: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    responsavel: Optional[str] = None
    observacoes: Optional[str] = None

class EstoqueCreate(BaseModel):
    produto_id: str
    quantidade: float
    tipo_movimento: MovimentoEstoque
    responsavel: Optional[str] = None
    observacoes: Optional[str] = None

class Venda(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pedido_id: str
    cliente_id: str
    cliente_nome: str
    items: List[ItemPedido]
    valor_total: float
    forma_pagamento: str
    data_venda: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    nfce_emitida: bool = False
    nfce_chave: Optional[str] = None

class VendaCreate(BaseModel):
    pedido_id: str
    forma_pagamento: str

class NFCe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venda_id: str
    chave_acesso: str
    numero: str
    serie: str
    cliente_cpf: Optional[str] = None
    cliente_nome: str
    valor_total: float
    data_emissao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "autorizada"
    protocolo: Optional[str] = None
    qr_code: Optional[str] = None

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.usuarios.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    hashed_password = bcrypt.hashpw(user_data.senha.encode(), bcrypt.gensalt())
    user_doc = {
        "id": str(uuid.uuid4()),
        "nome": user_data.nome,
        "email": user_data.email,
        "senha": hashed_password.decode(),
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.usuarios.insert_one(user_doc)
    
    user_response = {
        "id": user_doc["id"],
        "nome": user_doc["nome"],
        "email": user_doc["email"],
        "role": user_doc["role"],
        "created_at": user_doc["created_at"]
    }
    return {"message": "Usuário criado com sucesso", "user": user_response}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.usuarios.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not bcrypt.checkpw(credentials.senha.encode(), user["senha"].encode()):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    user.pop("senha")
    return {"token": token, "user": user}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.post("/clientes", response_model=Cliente)
async def criar_cliente(cliente: ClienteCreate, current_user: dict = Depends(get_current_user)):
    cliente_obj = Cliente(**cliente.model_dump())
    doc = cliente_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.clientes.insert_one(doc)
    return cliente_obj

@api_router.get("/clientes", response_model=List[Cliente])
async def listar_clientes(current_user: dict = Depends(get_current_user)):
    clientes = await db.clientes.find({}, {"_id": 0}).to_list(1000)
    for c in clientes:
        if isinstance(c['created_at'], str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return clientes

@api_router.get("/clientes/{cliente_id}", response_model=Cliente)
async def obter_cliente(cliente_id: str, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    if isinstance(cliente['created_at'], str):
        cliente['created_at'] = datetime.fromisoformat(cliente['created_at'])
    return cliente

@api_router.put("/clientes/{cliente_id}", response_model=Cliente)
async def atualizar_cliente(cliente_id: str, cliente_data: ClienteCreate, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    update_data = cliente_data.model_dump(exclude_unset=True)
    await db.clientes.update_one({"id": cliente_id}, {"$set": update_data})
    
    updated = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.delete("/clientes/{cliente_id}")
async def deletar_cliente(cliente_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.clientes.delete_one({"id": cliente_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return {"message": "Cliente deletado com sucesso"}

@api_router.post("/produtos", response_model=Produto)
async def criar_produto(produto: ProdutoCreate, current_user: dict = Depends(get_current_user)):
    produto_obj = Produto(**produto.model_dump())
    doc = produto_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.produtos.insert_one(doc)
    return produto_obj

@api_router.get("/produtos", response_model=List[Produto])
async def listar_produtos(current_user: dict = Depends(get_current_user)):
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(1000)
    for p in produtos:
        if isinstance(p['created_at'], str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return produtos

@api_router.get("/produtos/{produto_id}", response_model=Produto)
async def obter_produto(produto_id: str, current_user: dict = Depends(get_current_user)):
    produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    if isinstance(produto['created_at'], str):
        produto['created_at'] = datetime.fromisoformat(produto['created_at'])
    return produto

@api_router.put("/produtos/{produto_id}", response_model=Produto)
async def atualizar_produto(produto_id: str, produto_data: ProdutoCreate, current_user: dict = Depends(get_current_user)):
    produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    update_data = produto_data.model_dump(exclude_unset=True)
    await db.produtos.update_one({"id": produto_id}, {"$set": update_data})
    
    updated = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.delete("/produtos/{produto_id}")
async def deletar_produto(produto_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.produtos.delete_one({"id": produto_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return {"message": "Produto deletado com sucesso"}

@api_router.post("/pedidos", response_model=Pedido)
async def criar_pedido(pedido_data: PedidoCreate, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"id": pedido_data.cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    valor_total = sum(item.subtotal for item in pedido_data.items)
    
    count = await db.pedidos.count_documents({})
    numero_pedido = f"PED-{count + 1:06d}"
    
    pedido = Pedido(
        numero=numero_pedido,
        cliente_id=pedido_data.cliente_id,
        cliente_nome=cliente['nome'],
        items=pedido_data.items,
        valor_total=valor_total,
        observacoes=pedido_data.observacoes,
        data_entrega=datetime.fromisoformat(pedido_data.data_entrega) if pedido_data.data_entrega else None
    )
    
    doc = pedido.model_dump()
    doc['data_pedido'] = doc['data_pedido'].isoformat()
    if doc.get('data_entrega'):
        doc['data_entrega'] = doc['data_entrega'].isoformat()
    await db.pedidos.insert_one(doc)
    return pedido

@api_router.get("/pedidos", response_model=List[Pedido])
async def listar_pedidos(current_user: dict = Depends(get_current_user)):
    pedidos = await db.pedidos.find({}, {"_id": 0}).sort("data_pedido", -1).to_list(1000)
    for p in pedidos:
        if isinstance(p['data_pedido'], str):
            p['data_pedido'] = datetime.fromisoformat(p['data_pedido'])
        if p.get('data_entrega') and isinstance(p['data_entrega'], str):
            p['data_entrega'] = datetime.fromisoformat(p['data_entrega'])
    return pedidos

@api_router.get("/pedidos/{pedido_id}", response_model=Pedido)
async def obter_pedido(pedido_id: str, current_user: dict = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if isinstance(pedido['data_pedido'], str):
        pedido['data_pedido'] = datetime.fromisoformat(pedido['data_pedido'])
    if pedido.get('data_entrega') and isinstance(pedido['data_entrega'], str):
        pedido['data_entrega'] = datetime.fromisoformat(pedido['data_entrega'])
    return pedido

@api_router.patch("/pedidos/{pedido_id}/status")
async def atualizar_status_pedido(pedido_id: str, status: PedidoStatus, current_user: dict = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    update_data = {"status": status}
    if status == PedidoStatus.ENTREGUE:
        update_data["data_entrega"] = datetime.now(timezone.utc).isoformat()
    
    await db.pedidos.update_one({"id": pedido_id}, {"$set": update_data})
    return {"message": "Status atualizado com sucesso"}

@api_router.post("/producao", response_model=Producao)
async def criar_producao(producao_data: ProducaoCreate, current_user: dict = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"id": producao_data.pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    produto = await db.produtos.find_one({"id": producao_data.produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    producao = Producao(
        pedido_id=producao_data.pedido_id,
        pedido_numero=pedido['numero'],
        produto_id=producao_data.produto_id,
        produto_nome=produto['nome'],
        quantidade=producao_data.quantidade,
        responsavel=producao_data.responsavel,
        observacoes=producao_data.observacoes
    )
    
    doc = producao.model_dump()
    doc['data_inicio'] = doc['data_inicio'].isoformat()
    await db.producao.insert_one(doc)
    
    await db.pedidos.update_one(
        {"id": producao_data.pedido_id},
        {"$set": {"status": PedidoStatus.EM_PRODUCAO}}
    )
    
    return producao

@api_router.get("/producao", response_model=List[Producao])
async def listar_producao(current_user: dict = Depends(get_current_user)):
    producoes = await db.producao.find({}, {"_id": 0}).sort("data_inicio", -1).to_list(1000)
    for p in producoes:
        if isinstance(p['data_inicio'], str):
            p['data_inicio'] = datetime.fromisoformat(p['data_inicio'])
        if p.get('data_conclusao') and isinstance(p['data_conclusao'], str):
            p['data_conclusao'] = datetime.fromisoformat(p['data_conclusao'])
    return producoes

@api_router.patch("/producao/{producao_id}/concluir")
async def concluir_producao(producao_id: str, current_user: dict = Depends(get_current_user)):
    producao = await db.producao.find_one({"id": producao_id}, {"_id": 0})
    if not producao:
        raise HTTPException(status_code=404, detail="Produção não encontrada")
    
    await db.producao.update_one(
        {"id": producao_id},
        {"$set": {"data_conclusao": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Criar automaticamente registro de embalagem
    embalagem = {
        "id": str(uuid.uuid4()),
        "producao_id": producao_id,
        "pedido_id": producao['pedido_id'],
        "produto_nome": producao['produto_nome'],
        "quantidade": producao['quantidade'],
        "data_embalagem": datetime.now(timezone.utc).isoformat(),
        "responsavel": producao.get('responsavel'),
        "tipo_embalagem": None
    }
    await db.embalagem.insert_one(embalagem)
    
    # Atualizar status do pedido para em_embalagem
    await db.pedidos.update_one(
        {"id": producao['pedido_id']},
        {"$set": {"status": PedidoStatus.EM_EMBALAGEM}}
    )
    
    # Criar automaticamente entrada no estoque
    estoque = {
        "id": str(uuid.uuid4()),
        "produto_id": producao['produto_id'],
        "produto_nome": producao['produto_nome'],
        "quantidade": producao['quantidade'],
        "tipo_movimento": MovimentoEstoque.ENTRADA,
        "data_movimento": datetime.now(timezone.utc).isoformat(),
        "responsavel": producao.get('responsavel'),
        "observacoes": f"Entrada automática da produção do pedido {producao['pedido_numero']}"
    }
    await db.estoque.insert_one(estoque)
    
    return {"message": "Produção concluída, embalagem criada e produto adicionado ao estoque com sucesso"}

@api_router.post("/embalagem", response_model=Embalagem)
async def criar_embalagem(embalagem_data: EmbalagemCreate, current_user: dict = Depends(get_current_user)):
    producao = await db.producao.find_one({"id": embalagem_data.producao_id}, {"_id": 0})
    if not producao:
        raise HTTPException(status_code=404, detail="Produção não encontrada")
    
    embalagem = Embalagem(
        producao_id=embalagem_data.producao_id,
        pedido_id=embalagem_data.pedido_id,
        produto_nome=producao['produto_nome'],
        quantidade=embalagem_data.quantidade,
        responsavel=embalagem_data.responsavel,
        tipo_embalagem=embalagem_data.tipo_embalagem
    )
    
    doc = embalagem.model_dump()
    doc['data_embalagem'] = doc['data_embalagem'].isoformat()
    await db.embalagem.insert_one(doc)
    
    await db.pedidos.update_one(
        {"id": embalagem_data.pedido_id},
        {"$set": {"status": PedidoStatus.EM_EMBALAGEM}}
    )
    
    return embalagem

@api_router.get("/embalagem", response_model=List[Embalagem])
async def listar_embalagem(current_user: dict = Depends(get_current_user)):
    embalagens = await db.embalagem.find({}, {"_id": 0}).sort("data_embalagem", -1).to_list(1000)
    for e in embalagens:
        if isinstance(e['data_embalagem'], str):
            e['data_embalagem'] = datetime.fromisoformat(e['data_embalagem'])
    return embalagens

@api_router.post("/estoque", response_model=Estoque)
async def criar_movimento_estoque(estoque_data: EstoqueCreate, current_user: dict = Depends(get_current_user)):
    produto = await db.produtos.find_one({"id": estoque_data.produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    estoque = Estoque(
        produto_id=estoque_data.produto_id,
        produto_nome=produto['nome'],
        quantidade=estoque_data.quantidade,
        tipo_movimento=estoque_data.tipo_movimento,
        responsavel=estoque_data.responsavel,
        observacoes=estoque_data.observacoes
    )
    
    doc = estoque.model_dump()
    doc['data_movimento'] = doc['data_movimento'].isoformat()
    await db.estoque.insert_one(doc)
    
    return estoque

@api_router.get("/estoque", response_model=List[Estoque])
async def listar_estoque(current_user: dict = Depends(get_current_user)):
    movimentos = await db.estoque.find({}, {"_id": 0}).sort("data_movimento", -1).to_list(1000)
    for m in movimentos:
        if isinstance(m['data_movimento'], str):
            m['data_movimento'] = datetime.fromisoformat(m['data_movimento'])
    return movimentos

@api_router.get("/estoque/saldo")
async def obter_saldo_estoque(current_user: dict = Depends(get_current_user)):
    movimentos = await db.estoque.find({}, {"_id": 0}).to_list(10000)
    
    saldos = {}
    for mov in movimentos:
        pid = mov['produto_id']
        if pid not in saldos:
            saldos[pid] = {
                "produto_id": pid,
                "produto_nome": mov['produto_nome'],
                "quantidade": 0
            }
        
        if mov['tipo_movimento'] == MovimentoEstoque.ENTRADA:
            saldos[pid]['quantidade'] += mov['quantidade']
        elif mov['tipo_movimento'] == MovimentoEstoque.SAIDA:
            saldos[pid]['quantidade'] -= mov['quantidade']
        else:
            saldos[pid]['quantidade'] = mov['quantidade']
    
    return list(saldos.values())

@api_router.post("/vendas", response_model=Venda)
async def criar_venda(venda_data: VendaCreate, current_user: dict = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"id": venda_data.pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    venda = Venda(
        pedido_id=venda_data.pedido_id,
        cliente_id=pedido['cliente_id'],
        cliente_nome=pedido['cliente_nome'],
        items=pedido['items'],
        valor_total=pedido['valor_total'],
        forma_pagamento=venda_data.forma_pagamento
    )
    
    doc = venda.model_dump()
    doc['data_venda'] = doc['data_venda'].isoformat()
    await db.vendas.insert_one(doc)
    
    await db.pedidos.update_one(
        {"id": venda_data.pedido_id},
        {"$set": {"status": PedidoStatus.CONCLUIDO}}
    )
    
    for item in pedido['items']:
        await db.estoque.insert_one({
            "id": str(uuid.uuid4()),
            "produto_id": item['produto_id'],
            "produto_nome": item['produto_nome'],
            "quantidade": item['quantidade'],
            "tipo_movimento": MovimentoEstoque.SAIDA,
            "data_movimento": datetime.now(timezone.utc).isoformat(),
            "responsavel": current_user['nome'],
            "observacoes": f"Venda do pedido {pedido['numero']}"
        })
    
    return venda

@api_router.get("/vendas", response_model=List[Venda])
async def listar_vendas(current_user: dict = Depends(get_current_user)):
    vendas = await db.vendas.find({}, {"_id": 0}).sort("data_venda", -1).to_list(1000)
    for v in vendas:
        if isinstance(v['data_venda'], str):
            v['data_venda'] = datetime.fromisoformat(v['data_venda'])
    return vendas

@api_router.post("/nfce/emitir")
async def emitir_nfce(venda_id: str, current_user: dict = Depends(get_current_user)):
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    if venda.get('nfce_emitida'):
        raise HTTPException(status_code=400, detail="NFC-e já emitida para esta venda")
    
    cliente = await db.clientes.find_one({"id": venda['cliente_id']}, {"_id": 0})
    
    count = await db.nfce.count_documents({})
    numero_nfce = f"{count + 1:09d}"
    chave_acesso = f"35{datetime.now().strftime('%y%m')}12345678000190650010000{numero_nfce}{uuid.uuid4().hex[:8]}"
    
    nfce = NFCe(
        venda_id=venda_id,
        chave_acesso=chave_acesso,
        numero=numero_nfce,
        serie="001",
        cliente_cpf=cliente.get('cpf') if cliente else None,
        cliente_nome=venda['cliente_nome'],
        valor_total=venda['valor_total'],
        protocolo=f"PRT{uuid.uuid4().hex[:12].upper()}",
        qr_code=f"http://nfce.fazenda.gov.br/consulta?p={chave_acesso}"
    )
    
    doc = nfce.model_dump()
    doc['data_emissao'] = doc['data_emissao'].isoformat()
    await db.nfce.insert_one(doc)
    
    await db.vendas.update_one(
        {"id": venda_id},
        {"$set": {"nfce_emitida": True, "nfce_chave": chave_acesso}}
    )
    
    return nfce

@api_router.get("/nfce/{nfce_id}", response_model=NFCe)
async def obter_nfce(nfce_id: str, current_user: dict = Depends(get_current_user)):
    nfce = await db.nfce.find_one({"id": nfce_id}, {"_id": 0})
    if not nfce:
        raise HTTPException(status_code=404, detail="NFC-e não encontrada")
    if isinstance(nfce['data_emissao'], str):
        nfce['data_emissao'] = datetime.fromisoformat(nfce['data_emissao'])
    return nfce

@api_router.get("/nfce", response_model=List[NFCe])
async def listar_nfce(current_user: dict = Depends(get_current_user)):
    nfces = await db.nfce.find({}, {"_id": 0}).sort("data_emissao", -1).to_list(1000)
    for n in nfces:
        if isinstance(n['data_emissao'], str):
            n['data_emissao'] = datetime.fromisoformat(n['data_emissao'])
    return nfces

@api_router.get("/relatorios/vendas")
async def relatorio_vendas(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if data_inicio and data_fim:
        query['data_venda'] = {
            '$gte': data_inicio,
            '$lte': data_fim
        }
    
    vendas = await db.vendas.find(query, {"_id": 0}).to_list(10000)
    
    total_vendas = len(vendas)
    valor_total = sum(v['valor_total'] for v in vendas)
    
    vendas_por_dia = {}
    for v in vendas:
        data = v['data_venda'][:10] if isinstance(v['data_venda'], str) else v['data_venda'].date().isoformat()
        if data not in vendas_por_dia:
            vendas_por_dia[data] = {"data": data, "quantidade": 0, "valor": 0}
        vendas_por_dia[data]['quantidade'] += 1
        vendas_por_dia[data]['valor'] += v['valor_total']
    
    return {
        "total_vendas": total_vendas,
        "valor_total": valor_total,
        "ticket_medio": valor_total / total_vendas if total_vendas > 0 else 0,
        "vendas_por_dia": sorted(vendas_por_dia.values(), key=lambda x: x['data'])
    }

@api_router.get("/relatorios/producao")
async def relatorio_producao(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if data_inicio and data_fim:
        query['data_inicio'] = {
            '$gte': data_inicio,
            '$lte': data_fim
        }
    
    producoes = await db.producao.find(query, {"_id": 0}).to_list(10000)
    
    total_producoes = len(producoes)
    concluidas = sum(1 for p in producoes if p.get('data_conclusao'))
    em_andamento = total_producoes - concluidas
    
    por_produto = {}
    for p in producoes:
        nome = p['produto_nome']
        if nome not in por_produto:
            por_produto[nome] = {"produto": nome, "quantidade": 0}
        por_produto[nome]['quantidade'] += p['quantidade']
    
    return {
        "total_producoes": total_producoes,
        "concluidas": concluidas,
        "em_andamento": em_andamento,
        "por_produto": list(por_produto.values())
    }

@api_router.get("/relatorios/clientes")
async def relatorio_clientes(current_user: dict = Depends(get_current_user)):
    total_clientes = await db.clientes.count_documents({})
    
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(10000)
    
    por_cliente = {}
    for v in vendas:
        cid = v['cliente_id']
        if cid not in por_cliente:
            por_cliente[cid] = {
                "cliente_id": cid,
                "cliente_nome": v['cliente_nome'],
                "total_compras": 0,
                "valor_total": 0
            }
        por_cliente[cid]['total_compras'] += 1
        por_cliente[cid]['valor_total'] += v['valor_total']
    
    top_clientes = sorted(
        por_cliente.values(),
        key=lambda x: x['valor_total'],
        reverse=True
    )[:10]
    
    return {
        "total_clientes": total_clientes,
        "clientes_ativos": len(por_cliente),
        "top_clientes": top_clientes
    }

@api_router.get("/analise/lucratividade")
async def analise_lucratividade(current_user: dict = Depends(get_current_user)):
    """Análise de lucratividade por produto."""
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(1000)
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(10000)
    
    lucratividade_por_produto = {}
    
    for produto in produtos:
        pid = produto['id']
        custo = produto.get('custo_producao') or 0
        preco = produto.get('preco', 0)
        lucro = preco - custo
        margem = (lucro / preco * 100) if preco > 0 else 0
        
        if pid not in lucratividade_por_produto:
            lucratividade_por_produto[pid] = {
                "produto_id": pid,
                "produto_nome": produto['nome'],
                "categoria": produto['categoria'],
                "preco_venda": preco,
                "custo_producao": custo,
                "lucro_unitario": lucro,
                "margem_percentual": margem,
                "quantidade_vendida": 0,
                "receita_total": 0,
                "custo_total": 0,
                "lucro_total": 0
            }
    
    for venda in vendas:
        for item in venda['items']:
            pid = item['produto_id']
            if pid in lucratividade_por_produto:
                quantidade = item['quantidade']
                receita = item['subtotal']
                custo = lucratividade_por_produto[pid]['custo_producao'] * quantidade
                
                lucratividade_por_produto[pid]['quantidade_vendida'] += quantidade
                lucratividade_por_produto[pid]['receita_total'] += receita
                lucratividade_por_produto[pid]['custo_total'] += custo
                lucratividade_por_produto[pid]['lucro_total'] += (receita - custo)
    
    produtos_lucrativos = sorted(
        [p for p in lucratividade_por_produto.values() if p['quantidade_vendida'] > 0],
        key=lambda x: x['lucro_total'],
        reverse=True
    )
    
    receita_total_geral = sum(p['receita_total'] for p in produtos_lucrativos)
    lucro_total_geral = sum(p['lucro_total'] for p in produtos_lucrativos)
    custo_total_geral = sum(p['custo_total'] for p in produtos_lucrativos)
    
    return {
        "resumo": {
            "receita_total": receita_total_geral,
            "custo_total": custo_total_geral,
            "lucro_total": lucro_total_geral,
            "margem_geral": (lucro_total_geral / receita_total_geral * 100) if receita_total_geral > 0 else 0
        },
        "produtos": produtos_lucrativos,
        "top_5_mais_lucrativos": produtos_lucrativos[:5],
        "top_5_maior_margem": sorted(
            [p for p in produtos_lucrativos if p['quantidade_vendida'] > 0],
            key=lambda x: x['margem_percentual'],
            reverse=True
        )[:5]
    }

@api_router.get("/analise/produtos-desempenho")
async def analise_produtos_desempenho(current_user: dict = Depends(get_current_user)):
    """Análise de desempenho de produtos nas vendas."""
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(10000)
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(1000)
    
    desempenho = {}
    
    for produto in produtos:
        pid = produto['id']
        desempenho[pid] = {
            "produto_id": pid,
            "produto_nome": produto['nome'],
            "categoria": produto['categoria'],
            "total_vendido": 0,
            "frequencia_vendas": 0,
            "receita_gerada": 0
        }
    
    for venda in vendas:
        for item in venda['items']:
            pid = item['produto_id']
            if pid in desempenho:
                desempenho[pid]['total_vendido'] += item['quantidade']
                desempenho[pid]['frequencia_vendas'] += 1
                desempenho[pid]['receita_gerada'] += item['subtotal']
    
    produtos_desempenho = sorted(
        desempenho.values(),
        key=lambda x: x['receita_gerada'],
        reverse=True
    )
    
    return {
        "produtos": produtos_desempenho,
        "mais_vendidos": sorted(produtos_desempenho, key=lambda x: x['total_vendido'], reverse=True)[:10],
        "maior_receita": produtos_desempenho[:10]
    }

@api_router.get("/dashboard/stats")
async def dashboard_stats(current_user: dict = Depends(get_current_user)):
    hoje = datetime.now(timezone.utc).date().isoformat()
    mes_atual = datetime.now(timezone.utc).strftime("%Y-%m")
    
    total_clientes = await db.clientes.count_documents({})
    total_produtos = await db.produtos.count_documents({})
    
    pedidos_pendentes = await db.pedidos.count_documents({"status": PedidoStatus.PENDENTE})
    pedidos_em_producao = await db.pedidos.count_documents({"status": PedidoStatus.EM_PRODUCAO})
    
    vendas_mes = await db.vendas.find({
        "data_venda": {"$regex": f"^{mes_atual}"}
    }, {"_id": 0}).to_list(10000)
    
    valor_vendas_mes = sum(v['valor_total'] for v in vendas_mes)
    
    vendas_hoje = [v for v in vendas_mes if v['data_venda'].startswith(hoje)]
    valor_vendas_hoje = sum(v['valor_total'] for v in vendas_hoje)
    
    return {
        "total_clientes": total_clientes,
        "total_produtos": total_produtos,
        "pedidos_pendentes": pedidos_pendentes,
        "pedidos_em_producao": pedidos_em_producao,
        "vendas_mes": {
            "quantidade": len(vendas_mes),
            "valor_total": valor_vendas_mes
        },
        "vendas_hoje": {
            "quantidade": len(vendas_hoje),
            "valor_total": valor_vendas_hoje
        }
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()