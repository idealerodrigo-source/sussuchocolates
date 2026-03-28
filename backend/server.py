from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
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

class StatusCompra(str, Enum):
    PENDENTE = "pendente"
    APROVADA = "aprovada"
    RECEBIDA = "recebida"
    CANCELADA = "cancelada"

# Modelos de Fornecedores
class Fornecedor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    cnpj: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    contato_nome: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: bool = True
    data_cadastro: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FornecedorCreate(BaseModel):
    nome: str
    cnpj: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    contato_nome: Optional[str] = None
    observacoes: Optional[str] = None

# Modelos de Insumos
class Insumo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    unidade_medida: str = "un"
    fornecedor_id: Optional[str] = None
    fornecedor_nome: Optional[str] = None
    preco_unitario: float = 0.0
    estoque_minimo: float = 0.0
    estoque_atual: float = 0.0
    ativo: bool = True
    data_cadastro: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InsumoCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    unidade_medida: str = "un"
    fornecedor_id: Optional[str] = None
    preco_unitario: float = 0.0
    estoque_minimo: float = 0.0
    estoque_atual: float = 0.0

# Modelos de Compras
class ItemCompra(BaseModel):
    insumo_id: str
    insumo_nome: str
    quantidade: float
    preco_unitario: float
    subtotal: float

class Compra(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str
    fornecedor_id: str
    fornecedor_nome: str
    items: List[ItemCompra]
    valor_total: float
    status: StatusCompra = StatusCompra.PENDENTE
    data_pedido: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_entrega_prevista: Optional[datetime] = None
    data_recebimento: Optional[datetime] = None
    observacoes: Optional[str] = None

class CompraCreate(BaseModel):
    fornecedor_id: str
    items: List[ItemCompra]
    data_entrega_prevista: Optional[str] = None
    observacoes: Optional[str] = None

# Modelos para NF de Entrada
class ItemNFEntrada(BaseModel):
    codigo: Optional[str] = None
    descricao: str
    ncm: Optional[str] = None
    cst: Optional[str] = None
    cfop: Optional[str] = None
    unidade: str = "UN"
    quantidade: float
    valor_unitario: float
    valor_total: float
    valor_desconto: float = 0.0
    icms_base: float = 0.0
    icms_valor: float = 0.0
    ipi_valor: float = 0.0
    pis_valor: float = 0.0
    cofins_valor: float = 0.0

class NFEntrada(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chave_acesso: str
    numero_nf: str
    serie: Optional[str] = None
    data_emissao: datetime
    data_entrada: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    fornecedor_cnpj: str
    fornecedor_nome: str
    fornecedor_ie: Optional[str] = None
    fornecedor_endereco: Optional[str] = None
    fornecedor_municipio: Optional[str] = None
    fornecedor_uf: Optional[str] = None
    fornecedor_cep: Optional[str] = None
    fornecedor_telefone: Optional[str] = None
    items: List[ItemNFEntrada]
    valor_produtos: float
    valor_frete: float = 0.0
    valor_seguro: float = 0.0
    valor_outras: float = 0.0
    valor_desconto: float = 0.0
    valor_ipi: float = 0.0
    valor_icms: float = 0.0
    valor_pis: float = 0.0
    valor_cofins: float = 0.0
    valor_total: float
    informacoes_complementares: Optional[str] = None
    observacoes: Optional[str] = None
    status: str = "registrada"  # registrada, conferida, estornada

class NFEntradaCreate(BaseModel):
    chave_acesso: str
    numero_nf: str
    serie: Optional[str] = None
    data_emissao: str
    fornecedor_cnpj: str
    fornecedor_nome: str
    fornecedor_ie: Optional[str] = None
    fornecedor_endereco: Optional[str] = None
    fornecedor_municipio: Optional[str] = None
    fornecedor_uf: Optional[str] = None
    fornecedor_cep: Optional[str] = None
    fornecedor_telefone: Optional[str] = None
    items: List[ItemNFEntrada]
    valor_produtos: float
    valor_frete: float = 0.0
    valor_seguro: float = 0.0
    valor_outras: float = 0.0
    valor_desconto: float = 0.0
    valor_ipi: float = 0.0
    valor_icms: float = 0.0
    valor_pis: float = 0.0
    valor_cofins: float = 0.0
    valor_total: float
    informacoes_complementares: Optional[str] = None
    observacoes: Optional[str] = None

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
    desconto: Optional[float] = 0
    tipo_desconto: Optional[str] = "percentual"  # "percentual" ou "valor"
    valor_desconto: Optional[float] = 0
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
    pedido_id: Optional[str] = None
    pedido_numero: Optional[str] = None
    produto_id: str
    produto_nome: str
    quantidade: float
    data_inicio: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_conclusao: Optional[datetime] = None
    responsavel: Optional[str] = None
    observacoes: Optional[str] = None
    tipo_producao: str = "pedido"  # "pedido" ou "estoque"

class ProducaoCreate(BaseModel):
    pedido_id: Optional[str] = None
    produto_id: str
    quantidade: float
    responsavel: Optional[str] = None
    observacoes: Optional[str] = None
    tipo_producao: str = "pedido"  # "pedido" ou "estoque"

class Embalagem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    producao_id: str
    pedido_id: Optional[str] = None
    pedido_numero: Optional[str] = None
    cliente_nome: Optional[str] = None
    produto_nome: str
    quantidade: float
    data_inicio: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_conclusao: Optional[datetime] = None
    responsavel: Optional[str] = None
    responsavel_conclusao: Optional[str] = None
    tipo_embalagem: Optional[str] = None

class EmbalagemCreate(BaseModel):
    producao_id: str
    pedido_id: Optional[str] = None
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
    localizacao: Optional[str] = None

class EstoqueCreate(BaseModel):
    produto_id: str
    quantidade: float
    tipo_movimento: MovimentoEstoque
    responsavel: Optional[str] = None
    observacoes: Optional[str] = None
    localizacao: Optional[str] = None

class ConcluirEmbalagemRequest(BaseModel):
    localizacao: Optional[str] = None
    responsavel_conclusao: Optional[str] = None

class Venda(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pedido_id: Optional[str] = None
    cliente_id: str
    cliente_nome: str
    items: List[ItemPedido]
    valor_total: float
    forma_pagamento: str
    data_venda: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    nfce_emitida: bool = False
    nfce_chave: Optional[str] = None
    nfce_numero: Optional[str] = None
    tipo_venda: str = "pedido"  # "pedido" ou "direta"
    entrega_posterior: bool = False
    status_pagamento: str = "pago"  # "pago" ou "pendente"
    data_previsao_pagamento: Optional[str] = None
    observacoes_pagamento: Optional[str] = None
    data_pagamento: Optional[datetime] = None

class VendaCreate(BaseModel):
    pedido_id: Optional[str] = None
    cliente_id: Optional[str] = None
    items: Optional[List[ItemPedido]] = None
    forma_pagamento: str
    tipo_venda: str = "pedido"
    entrega_posterior: bool = False
    status_pagamento: str = "pago"
    data_previsao_pagamento: Optional[str] = None
    observacoes_pagamento: Optional[str] = None

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

class PedidoUpdate(BaseModel):
    cliente_id: Optional[str] = None
    items: Optional[List[ItemPedido]] = None
    observacoes: Optional[str] = None
    data_entrega: Optional[str] = None

@api_router.put("/pedidos/{pedido_id}", response_model=Pedido)
async def atualizar_pedido(pedido_id: str, pedido_data: PedidoUpdate, current_user: dict = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    update_data = {}
    
    # Atualizar cliente se fornecido
    if pedido_data.cliente_id:
        cliente = await db.clientes.find_one({"id": pedido_data.cliente_id}, {"_id": 0})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        update_data["cliente_id"] = pedido_data.cliente_id
        update_data["cliente_nome"] = cliente['nome']
    
    # Atualizar itens se fornecidos
    if pedido_data.items is not None:
        items_dict = [item.model_dump() for item in pedido_data.items]
        update_data["items"] = items_dict
        update_data["valor_total"] = sum(item.subtotal for item in pedido_data.items)
    
    # Atualizar observações
    if pedido_data.observacoes is not None:
        update_data["observacoes"] = pedido_data.observacoes
    
    # Atualizar data de entrega
    if pedido_data.data_entrega is not None:
        update_data["data_entrega"] = pedido_data.data_entrega if pedido_data.data_entrega else None
    
    if update_data:
        await db.pedidos.update_one({"id": pedido_id}, {"$set": update_data})
    
    # Retornar pedido atualizado
    updated = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if isinstance(updated['data_pedido'], str):
        updated['data_pedido'] = datetime.fromisoformat(updated['data_pedido'])
    if updated.get('data_entrega') and isinstance(updated['data_entrega'], str):
        updated['data_entrega'] = datetime.fromisoformat(updated['data_entrega'])
    return updated

@api_router.post("/producao", response_model=Producao)
async def criar_producao(producao_data: ProducaoCreate, current_user: dict = Depends(get_current_user)):
    produto = await db.produtos.find_one({"id": producao_data.produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    pedido_numero = None
    pedido_id = None
    tipo_producao = producao_data.tipo_producao
    
    # Se tem pedido_id, valida e usa dados do pedido
    if producao_data.pedido_id:
        pedido = await db.pedidos.find_one({"id": producao_data.pedido_id}, {"_id": 0})
        if not pedido:
            raise HTTPException(status_code=404, detail="Pedido não encontrado")
        pedido_numero = pedido['numero']
        pedido_id = producao_data.pedido_id
        tipo_producao = "pedido"
        
        # Atualizar status do pedido
        await db.pedidos.update_one(
            {"id": producao_data.pedido_id},
            {"$set": {"status": PedidoStatus.EM_PRODUCAO}}
        )
    else:
        # Produção para estoque (sem pedido)
        tipo_producao = "estoque"
        # Gerar número de produção interno
        count = await db.producao.count_documents({"tipo_producao": "estoque"})
        pedido_numero = f"EST-{count + 1:06d}"
    
    producao = Producao(
        pedido_id=pedido_id,
        pedido_numero=pedido_numero,
        produto_id=producao_data.produto_id,
        produto_nome=produto['nome'],
        quantidade=producao_data.quantidade,
        responsavel=producao_data.responsavel,
        observacoes=producao_data.observacoes,
        tipo_producao=tipo_producao
    )
    
    doc = producao.model_dump()
    doc['data_inicio'] = doc['data_inicio'].isoformat()
    await db.producao.insert_one(doc)
    
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
    
    # Buscar informações do pedido se existir
    pedido_numero = None
    cliente_nome = None
    if producao.get('pedido_id'):
        pedido = await db.pedidos.find_one({"id": producao['pedido_id']}, {"_id": 0})
        if pedido:
            pedido_numero = pedido.get('numero')
            cliente_nome = pedido.get('cliente_nome')
    
    # Criar automaticamente registro de embalagem PENDENTE
    embalagem = {
        "id": str(uuid.uuid4()),
        "producao_id": producao_id,
        "pedido_id": producao.get('pedido_id'),
        "pedido_numero": pedido_numero or producao.get('pedido_numero'),
        "cliente_nome": cliente_nome,
        "produto_nome": producao['produto_nome'],
        "quantidade": producao['quantidade'],
        "data_inicio": datetime.now(timezone.utc).isoformat(),
        "data_conclusao": None,
        "responsavel": producao.get('responsavel'),
        "tipo_embalagem": None
    }
    await db.embalagem.insert_one(embalagem)
    
    # Atualizar status do pedido para em_embalagem (se tiver pedido)
    if producao.get('pedido_id'):
        await db.pedidos.update_one(
            {"id": producao['pedido_id']},
            {"$set": {"status": PedidoStatus.EM_EMBALAGEM}}
        )
    
    return {"message": "Produção concluída e enviada para embalagem"}

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
    embalagens = await db.embalagem.find({}, {"_id": 0}).sort("data_inicio", -1).to_list(1000)
    for e in embalagens:
        if isinstance(e.get('data_inicio'), str):
            e['data_inicio'] = datetime.fromisoformat(e['data_inicio'])
        if e.get('data_conclusao') and isinstance(e['data_conclusao'], str):
            e['data_conclusao'] = datetime.fromisoformat(e['data_conclusao'])
        # Compatibilidade com dados antigos
        if 'data_embalagem' in e and 'data_inicio' not in e:
            e['data_inicio'] = datetime.fromisoformat(e['data_embalagem']) if isinstance(e['data_embalagem'], str) else e['data_embalagem']
        
        # Buscar pedido_numero e cliente_nome se não existir
        if not e.get('pedido_numero') and e.get('pedido_id'):
            pedido = await db.pedidos.find_one({"id": e['pedido_id']}, {"_id": 0})
            if pedido:
                e['pedido_numero'] = pedido.get('numero')
                e['cliente_nome'] = pedido.get('cliente_nome')
        elif not e.get('pedido_numero') and e.get('producao_id'):
            # Tentar buscar da produção
            producao = await db.producao.find_one({"id": e['producao_id']}, {"_id": 0})
            if producao:
                e['pedido_numero'] = producao.get('pedido_numero')
                if producao.get('pedido_id'):
                    pedido = await db.pedidos.find_one({"id": producao['pedido_id']}, {"_id": 0})
                    if pedido:
                        e['cliente_nome'] = pedido.get('cliente_nome')
    return embalagens

@api_router.patch("/embalagem/{embalagem_id}/concluir")
async def concluir_embalagem(embalagem_id: str, request: ConcluirEmbalagemRequest = None, current_user: dict = Depends(get_current_user)):
    embalagem = await db.embalagem.find_one({"id": embalagem_id}, {"_id": 0})
    if not embalagem:
        raise HTTPException(status_code=404, detail="Embalagem não encontrada")
    
    if embalagem.get('data_conclusao'):
        raise HTTPException(status_code=400, detail="Embalagem já foi concluída")
    
    # Obter dados do request
    localizacao = request.localizacao if request else None
    responsavel_conclusao = request.responsavel_conclusao if request else None
    
    # Marcar embalagem como concluída com responsável
    update_data = {
        "data_conclusao": datetime.now(timezone.utc).isoformat()
    }
    if responsavel_conclusao:
        update_data["responsavel_conclusao"] = responsavel_conclusao
    
    await db.embalagem.update_one(
        {"id": embalagem_id},
        {"$set": update_data}
    )
    
    # Buscar produção para obter produto_id
    producao = await db.producao.find_one({"id": embalagem['producao_id']}, {"_id": 0})
    
    # Adicionar automaticamente ao estoque
    estoque = {
        "id": str(uuid.uuid4()),
        "produto_id": producao['produto_id'],
        "produto_nome": embalagem['produto_nome'],
        "quantidade": embalagem['quantidade'],
        "tipo_movimento": MovimentoEstoque.ENTRADA,
        "data_movimento": datetime.now(timezone.utc).isoformat(),
        "responsavel": responsavel_conclusao or embalagem.get('responsavel') or current_user['nome'],
        "observacoes": f"Entrada automática - Embalagem concluída (Produção: {producao['pedido_numero']})",
        "localizacao": localizacao
    }
    await db.estoque.insert_one(estoque)
    
    return {"message": "Embalagem concluída e produto adicionado ao estoque com sucesso"}

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
        observacoes=estoque_data.observacoes,
        localizacao=estoque_data.localizacao
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
                "quantidade": 0,
                "localizacao": mov.get('localizacao')
            }
        
        if mov['tipo_movimento'] == MovimentoEstoque.ENTRADA:
            saldos[pid]['quantidade'] += mov['quantidade']
            # Atualiza a localização com a mais recente entrada
            if mov.get('localizacao'):
                saldos[pid]['localizacao'] = mov.get('localizacao')
        elif mov['tipo_movimento'] == MovimentoEstoque.SAIDA:
            saldos[pid]['quantidade'] -= mov['quantidade']
        else:
            saldos[pid]['quantidade'] = mov['quantidade']
            if mov.get('localizacao'):
                saldos[pid]['localizacao'] = mov.get('localizacao')
    
    return list(saldos.values())

@api_router.post("/vendas", response_model=Venda)
async def criar_venda(venda_data: VendaCreate, current_user: dict = Depends(get_current_user)):
    if venda_data.tipo_venda == "pedido":
        # Venda a partir de pedido existente
        if not venda_data.pedido_id:
            raise HTTPException(status_code=400, detail="pedido_id é obrigatório para vendas de pedido")
        
        pedido = await db.pedidos.find_one({"id": venda_data.pedido_id}, {"_id": 0})
        if not pedido:
            raise HTTPException(status_code=404, detail="Pedido não encontrado")
        
        venda = Venda(
            pedido_id=venda_data.pedido_id,
            cliente_id=pedido['cliente_id'],
            cliente_nome=pedido['cliente_nome'],
            items=pedido['items'],
            valor_total=pedido['valor_total'],
            forma_pagamento=venda_data.forma_pagamento,
            tipo_venda="pedido",
            entrega_posterior=venda_data.entrega_posterior,
            status_pagamento=venda_data.status_pagamento,
            data_previsao_pagamento=venda_data.data_previsao_pagamento,
            observacoes_pagamento=venda_data.observacoes_pagamento
        )
        
        # Atualizar status do pedido
        await db.pedidos.update_one(
            {"id": venda_data.pedido_id},
            {"$set": {"status": PedidoStatus.CONCLUIDO}}
        )
    else:
        # Venda direta
        if not venda_data.cliente_id or not venda_data.items:
            raise HTTPException(status_code=400, detail="cliente_id e items são obrigatórios para vendas diretas")
        
        cliente = await db.clientes.find_one({"id": venda_data.cliente_id}, {"_id": 0})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        valor_total = sum(item.subtotal for item in venda_data.items)
        
        venda = Venda(
            pedido_id=None,
            cliente_id=venda_data.cliente_id,
            cliente_nome=cliente['nome'],
            items=venda_data.items,
            valor_total=valor_total,
            forma_pagamento=venda_data.forma_pagamento,
            tipo_venda="direta",
            entrega_posterior=venda_data.entrega_posterior,
            status_pagamento=venda_data.status_pagamento,
            data_previsao_pagamento=venda_data.data_previsao_pagamento,
            observacoes_pagamento=venda_data.observacoes_pagamento
        )
    
    doc = venda.model_dump()
    doc['data_venda'] = doc['data_venda'].isoformat()
    if doc.get('data_pagamento'):
        doc['data_pagamento'] = doc['data_pagamento'].isoformat()
    await db.vendas.insert_one(doc)
    
    # Dar baixa no estoque
    for item in venda.items:
        await db.estoque.insert_one({
            "id": str(uuid.uuid4()),
            "produto_id": item.produto_id,
            "produto_nome": item.produto_nome,
            "quantidade": item.quantidade,
            "tipo_movimento": MovimentoEstoque.SAIDA,
            "data_movimento": datetime.now(timezone.utc).isoformat(),
            "responsavel": current_user['nome'],
            "observacoes": f"Venda {venda.tipo_venda} - ID: {venda.id}"
        })
    
    return venda

@api_router.get("/vendas", response_model=List[Venda])
async def listar_vendas(current_user: dict = Depends(get_current_user)):
    vendas = await db.vendas.find({}, {"_id": 0}).sort("data_venda", -1).to_list(1000)
    for v in vendas:
        if isinstance(v['data_venda'], str):
            v['data_venda'] = datetime.fromisoformat(v['data_venda'])
        if isinstance(v.get('data_pagamento'), str):
            v['data_pagamento'] = datetime.fromisoformat(v['data_pagamento'])
    return vendas

@api_router.put("/vendas/{venda_id}/confirmar-pagamento")
async def confirmar_pagamento_venda(venda_id: str, current_user: dict = Depends(get_current_user)):
    """Confirma o pagamento de uma venda com status pendente"""
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    if venda.get('status_pagamento') == 'pago':
        raise HTTPException(status_code=400, detail="Esta venda já está paga")
    
    await db.vendas.update_one(
        {"id": venda_id},
        {"$set": {
            "status_pagamento": "pago",
            "data_pagamento": datetime.now(timezone.utc).isoformat(),
            "entrega_posterior": False
        }}
    )
    
    return {"message": "Pagamento confirmado com sucesso"}

# NFC-e - Rotas específicas primeiro (antes das rotas com parâmetros dinâmicos)
from nfce_service import (
    verificar_certificado,
    status_servico_sefaz,
    emitir_nfce as nfce_emitir_real,
    cancelar_nfce,
    NFCeEmissao,
    ItemNFCe,
    DadosClienteNFCe,
    HOMOLOGACAO
)

@api_router.get("/nfce/configuracao")
async def nfce_configuracao(current_user: dict = Depends(get_current_user)):
    """Retorna configuração e status do módulo NFC-e"""
    cert_info = verificar_certificado()
    return {
        "certificado": cert_info,
        "ambiente": "Homologação" if HOMOLOGACAO else "Produção",
        "uf": "PR",
        "configurado": cert_info.get("valido", False)
    }

@api_router.get("/nfce/status-sefaz")
async def nfce_status_sefaz(current_user: dict = Depends(get_current_user)):
    """Consulta status do serviço da SEFAZ"""
    return status_servico_sefaz()

@api_router.get("/nfce/historico")
async def nfce_historico(
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Lista histórico de NFC-e emitidas"""
    nfces = await db.nfce.find({}, {"_id": 0}).sort("data_emissao", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.nfce.count_documents({})
    return {"items": nfces, "total": total}

@api_router.post("/nfce/emitir")
async def nfce_emitir(dados: dict, current_user: dict = Depends(get_current_user)):
    """Emite uma NFC-e via SEFAZ"""
    try:
        items = [ItemNFCe(**item) for item in dados.get('items', [])]
        
        cliente = None
        if dados.get('cliente'):
            cliente = DadosClienteNFCe(**dados['cliente'])
        
        emissao = NFCeEmissao(
            venda_id=dados.get('venda_id'),
            cliente=cliente,
            items=items,
            valor_produtos=dados.get('valor_produtos', 0),
            valor_desconto=dados.get('valor_desconto', 0),
            valor_total=dados.get('valor_total', 0),
            forma_pagamento=dados.get('forma_pagamento', '01'),
            valor_pago=dados.get('valor_pago', 0),
            valor_troco=dados.get('valor_troco', 0)
        )
        
        resultado = nfce_emitir_real(emissao)
        
        if resultado.success:
            nfce_doc = {
                "id": emissao.id,
                "venda_id": emissao.venda_id,
                "chave_acesso": resultado.chave_acesso,
                "numero_nfce": resultado.numero_nfce,
                "protocolo": resultado.protocolo,
                "data_autorizacao": resultado.data_autorizacao,
                "data_emissao": datetime.now(timezone.utc).isoformat(),
                "valor_total": emissao.valor_total,
                "status": "autorizada",
                "ambiente": "homologacao" if HOMOLOGACAO else "producao",
                "qrcode_url": resultado.qrcode_url
            }
            await db.nfce.insert_one(nfce_doc)
            
            # Atualizar venda com dados da NFC-e
            if emissao.venda_id:
                await db.vendas.update_one(
                    {"id": emissao.venda_id},
                    {"$set": {
                        "nfce_emitida": True,
                        "nfce_chave": resultado.chave_acesso,
                        "nfce_numero": resultado.numero_nfce
                    }}
                )
        
        return resultado.model_dump()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/nfce/cancelar/{chave_acesso}")
async def nfce_cancelar_endpoint(chave_acesso: str, justificativa: str, current_user: dict = Depends(get_current_user)):
    """Cancela uma NFC-e"""
    resultado = cancelar_nfce(chave_acesso, justificativa)
    
    if resultado.get('success'):
        await db.nfce.update_one(
            {"chave_acesso": chave_acesso},
            {"$set": {"status": "cancelada", "data_cancelamento": datetime.now(timezone.utc).isoformat()}}
        )
    
    return resultado

# Rotas com parâmetros dinâmicos - DEVEM VIR DEPOIS das rotas específicas
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

# ============ FORNECEDORES ============
@api_router.get("/fornecedores", response_model=List[Fornecedor])
async def listar_fornecedores(current_user: dict = Depends(get_current_user)):
    fornecedores = await db.fornecedores.find({}, {"_id": 0}).sort("nome", 1).to_list(1000)
    for f in fornecedores:
        if isinstance(f.get('data_cadastro'), str):
            f['data_cadastro'] = datetime.fromisoformat(f['data_cadastro'])
    return fornecedores

@api_router.post("/fornecedores", response_model=Fornecedor)
async def criar_fornecedor(fornecedor_data: FornecedorCreate, current_user: dict = Depends(get_current_user)):
    fornecedor = Fornecedor(**fornecedor_data.model_dump())
    doc = fornecedor.model_dump()
    doc['data_cadastro'] = doc['data_cadastro'].isoformat()
    await db.fornecedores.insert_one(doc)
    return fornecedor

@api_router.put("/fornecedores/{fornecedor_id}", response_model=Fornecedor)
async def atualizar_fornecedor(fornecedor_id: str, fornecedor_data: FornecedorCreate, current_user: dict = Depends(get_current_user)):
    fornecedor = await db.fornecedores.find_one({"id": fornecedor_id}, {"_id": 0})
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    update_data = fornecedor_data.model_dump()
    await db.fornecedores.update_one({"id": fornecedor_id}, {"$set": update_data})
    
    updated = await db.fornecedores.find_one({"id": fornecedor_id}, {"_id": 0})
    if isinstance(updated.get('data_cadastro'), str):
        updated['data_cadastro'] = datetime.fromisoformat(updated['data_cadastro'])
    return updated

@api_router.delete("/fornecedores/{fornecedor_id}")
async def deletar_fornecedor(fornecedor_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.fornecedores.delete_one({"id": fornecedor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    return {"message": "Fornecedor removido com sucesso"}

# ============ INSUMOS ============
@api_router.get("/insumos", response_model=List[Insumo])
async def listar_insumos(current_user: dict = Depends(get_current_user)):
    insumos = await db.insumos.find({}, {"_id": 0}).sort("nome", 1).to_list(1000)
    for i in insumos:
        if isinstance(i.get('data_cadastro'), str):
            i['data_cadastro'] = datetime.fromisoformat(i['data_cadastro'])
    return insumos

@api_router.post("/insumos", response_model=Insumo)
async def criar_insumo(insumo_data: InsumoCreate, current_user: dict = Depends(get_current_user)):
    fornecedor_nome = None
    if insumo_data.fornecedor_id:
        fornecedor = await db.fornecedores.find_one({"id": insumo_data.fornecedor_id}, {"_id": 0})
        if fornecedor:
            fornecedor_nome = fornecedor['nome']
    
    insumo = Insumo(**insumo_data.model_dump(), fornecedor_nome=fornecedor_nome)
    doc = insumo.model_dump()
    doc['data_cadastro'] = doc['data_cadastro'].isoformat()
    await db.insumos.insert_one(doc)
    return insumo

@api_router.put("/insumos/{insumo_id}", response_model=Insumo)
async def atualizar_insumo(insumo_id: str, insumo_data: InsumoCreate, current_user: dict = Depends(get_current_user)):
    insumo = await db.insumos.find_one({"id": insumo_id}, {"_id": 0})
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo não encontrado")
    
    fornecedor_nome = None
    if insumo_data.fornecedor_id:
        fornecedor = await db.fornecedores.find_one({"id": insumo_data.fornecedor_id}, {"_id": 0})
        if fornecedor:
            fornecedor_nome = fornecedor['nome']
    
    update_data = insumo_data.model_dump()
    update_data['fornecedor_nome'] = fornecedor_nome
    await db.insumos.update_one({"id": insumo_id}, {"$set": update_data})
    
    updated = await db.insumos.find_one({"id": insumo_id}, {"_id": 0})
    if isinstance(updated.get('data_cadastro'), str):
        updated['data_cadastro'] = datetime.fromisoformat(updated['data_cadastro'])
    return updated

@api_router.delete("/insumos/{insumo_id}")
async def deletar_insumo(insumo_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.insumos.delete_one({"id": insumo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Insumo não encontrado")
    return {"message": "Insumo removido com sucesso"}

# ============ COMPRAS ============
@api_router.get("/compras", response_model=List[Compra])
async def listar_compras(current_user: dict = Depends(get_current_user)):
    compras = await db.compras.find({}, {"_id": 0}).sort("data_pedido", -1).to_list(1000)
    for c in compras:
        if isinstance(c.get('data_pedido'), str):
            c['data_pedido'] = datetime.fromisoformat(c['data_pedido'])
        if c.get('data_entrega_prevista') and isinstance(c['data_entrega_prevista'], str):
            c['data_entrega_prevista'] = datetime.fromisoformat(c['data_entrega_prevista'])
        if c.get('data_recebimento') and isinstance(c['data_recebimento'], str):
            c['data_recebimento'] = datetime.fromisoformat(c['data_recebimento'])
    return compras

@api_router.post("/compras", response_model=Compra)
async def criar_compra(compra_data: CompraCreate, current_user: dict = Depends(get_current_user)):
    fornecedor = await db.fornecedores.find_one({"id": compra_data.fornecedor_id}, {"_id": 0})
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    # Gerar número da compra
    count = await db.compras.count_documents({})
    numero = f"CMP-{count + 1:06d}"
    
    valor_total = sum(item.subtotal for item in compra_data.items)
    
    compra = Compra(
        numero=numero,
        fornecedor_id=compra_data.fornecedor_id,
        fornecedor_nome=fornecedor['nome'],
        items=compra_data.items,
        valor_total=valor_total,
        observacoes=compra_data.observacoes
    )
    
    if compra_data.data_entrega_prevista:
        compra.data_entrega_prevista = datetime.fromisoformat(compra_data.data_entrega_prevista)
    
    doc = compra.model_dump()
    doc['data_pedido'] = doc['data_pedido'].isoformat()
    if doc.get('data_entrega_prevista'):
        doc['data_entrega_prevista'] = doc['data_entrega_prevista'].isoformat()
    
    await db.compras.insert_one(doc)
    return compra

@api_router.patch("/compras/{compra_id}/status")
async def atualizar_status_compra(compra_id: str, status: StatusCompra, current_user: dict = Depends(get_current_user)):
    compra = await db.compras.find_one({"id": compra_id}, {"_id": 0})
    if not compra:
        raise HTTPException(status_code=404, detail="Compra não encontrada")
    
    update_data = {"status": status}
    
    # Se estiver recebendo, atualiza estoque de insumos
    if status == StatusCompra.RECEBIDA:
        update_data["data_recebimento"] = datetime.now(timezone.utc).isoformat()
        
        # Atualizar estoque dos insumos
        for item in compra['items']:
            await db.insumos.update_one(
                {"id": item['insumo_id']},
                {"$inc": {"estoque_atual": item['quantidade']}}
            )
    
    await db.compras.update_one({"id": compra_id}, {"$set": update_data})
    return {"message": f"Status da compra atualizado para {status}"}

@api_router.delete("/compras/{compra_id}")
async def deletar_compra(compra_id: str, current_user: dict = Depends(get_current_user)):
    compra = await db.compras.find_one({"id": compra_id}, {"_id": 0})
    if not compra:
        raise HTTPException(status_code=404, detail="Compra não encontrada")
    
    if compra['status'] == StatusCompra.RECEBIDA:
        raise HTTPException(status_code=400, detail="Não é possível excluir uma compra já recebida")
    
    result = await db.compras.delete_one({"id": compra_id})
    return {"message": "Compra removida com sucesso"}

# ============ RELATÓRIOS DE PRODUÇÃO ============

@api_router.get("/relatorios/producao/pendente")
async def relatorio_producao_pendente(current_user: dict = Depends(get_current_user)):
    """
    Relatório de itens a serem produzidos com quantidade solicitada, produzida e faltante
    Considera apenas pedidos que NÃO foram entregues, cancelados ou concluídos (vendidos)
    """
    # Buscar pedidos ativos (pendentes, em produção, em embalagem - NÃO concluídos/entregues/cancelados)
    pedidos = await db.pedidos.find(
        {"status": {"$nin": ["entregue", "cancelado", "concluido"]}},
        {"_id": 0}
    ).to_list(1000)
    
    # Se não há pedidos pendentes, retornar vazio
    if not pedidos:
        return {
            "total_itens": 0,
            "quantidade_total_solicitada": 0,
            "quantidade_total_produzida": 0,
            "quantidade_total_faltante": 0,
            "itens": []
        }
    
    # Buscar todas as produções concluídas
    todas_producoes = await db.producao.find(
        {"data_conclusao": {"$ne": None}},
        {"_id": 0}
    ).to_list(5000)
    
    # Calcular quantidade já produzida por pedido e produto
    producao_por_pedido = {}  # {pedido_id: {produto_nome: quantidade_produzida}}
    for prod in todas_producoes:
        pedido_id = prod.get('pedido_id')
        if not pedido_id:
            continue
        
        if pedido_id not in producao_por_pedido:
            producao_por_pedido[pedido_id] = {}
        
        # Produção tem campos diretos, não dentro de 'items'
        produto_nome = prod.get('produto_nome', 'Produto Desconhecido')
        quantidade = prod.get('quantidade', 0)
        
        if produto_nome not in producao_por_pedido[pedido_id]:
            producao_por_pedido[pedido_id][produto_nome] = 0
        producao_por_pedido[pedido_id][produto_nome] += quantidade
    
    # Agrupar por produto com totais
    produtos_agrupados = {}
    for pedido in pedidos:
        pedido_id = pedido.get('id')
        pedido_numero = pedido.get('numero', 'N/A')
        cliente_nome = pedido.get('cliente_nome', 'N/A')
        
        for item in pedido.get('items', []):
            produto_nome = item.get('produto_nome', 'Produto Desconhecido')
            quantidade_solicitada = item.get('quantidade', 0)
            
            # Quantidade já produzida para este pedido/produto
            quantidade_produzida = producao_por_pedido.get(pedido_id, {}).get(produto_nome, 0)
            quantidade_faltante = max(0, quantidade_solicitada - quantidade_produzida)
            
            if produto_nome not in produtos_agrupados:
                produtos_agrupados[produto_nome] = {
                    'produto_nome': produto_nome,
                    'quantidade_solicitada': 0,
                    'quantidade_produzida': 0,
                    'quantidade_faltante': 0,
                    'pedidos': []
                }
            
            produtos_agrupados[produto_nome]['quantidade_solicitada'] += quantidade_solicitada
            produtos_agrupados[produto_nome]['quantidade_produzida'] += quantidade_produzida
            produtos_agrupados[produto_nome]['quantidade_faltante'] += quantidade_faltante
            
            # Só adicionar pedido se tiver quantidade faltante
            if quantidade_faltante > 0:
                produtos_agrupados[produto_nome]['pedidos'].append({
                    'pedido_id': pedido_id,
                    'pedido_numero': pedido_numero,
                    'cliente_nome': cliente_nome,
                    'quantidade_solicitada': quantidade_solicitada,
                    'quantidade_produzida': quantidade_produzida,
                    'quantidade_faltante': quantidade_faltante
                })
    
    # Filtrar apenas produtos com quantidade faltante > 0
    resultado = [p for p in produtos_agrupados.values() if p['quantidade_faltante'] > 0]
    resultado.sort(key=lambda x: x['quantidade_faltante'], reverse=True)
    
    return {
        "total_itens": len(resultado),
        "quantidade_total_solicitada": sum(p['quantidade_solicitada'] for p in resultado),
        "quantidade_total_produzida": sum(p['quantidade_produzida'] for p in resultado),
        "quantidade_total_faltante": sum(p['quantidade_faltante'] for p in resultado),
        "itens": resultado
    }

@api_router.get("/relatorios/producao/concluida")
async def relatorio_producao_concluida(
    data_inicio: str = None,
    data_fim: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Relatório de itens já produzidos (agrupados por produto)
    """
    # Filtro de data - produções com data_conclusao (concluídas)
    filtro = {"data_conclusao": {"$ne": None}}
    
    if data_inicio:
        filtro["data_conclusao"]["$gte"] = data_inicio
    if data_fim:
        filtro["data_conclusao"]["$lte"] = data_fim
    
    producoes = await db.producao.find(filtro, {"_id": 0}).to_list(5000)
    
    # Agrupar por produto
    produtos_agrupados = {}
    for prod in producoes:
        # Produção tem campos diretos, não dentro de 'items'
        produto_nome = prod.get('produto_nome', 'Produto Desconhecido')
        quantidade = prod.get('quantidade', 0)
        
        if produto_nome not in produtos_agrupados:
            produtos_agrupados[produto_nome] = {
                'produto_nome': produto_nome,
                'quantidade_total': 0,
                'producoes_count': 0
            }
        
        produtos_agrupados[produto_nome]['quantidade_total'] += quantidade
        produtos_agrupados[produto_nome]['producoes_count'] += 1
    
    resultado = list(produtos_agrupados.values())
    resultado.sort(key=lambda x: x['quantidade_total'], reverse=True)
    
    return {
        "total_tipos_produto": len(resultado),
        "quantidade_total_produzida": sum(p['quantidade_total'] for p in resultado),
        "itens": resultado
    }

@api_router.get("/relatorios/pedidos/resumo")
async def relatorio_pedidos_resumo(current_user: dict = Depends(get_current_user)):
    """
    Relatório resumo de itens dos pedidos (pendentes e em produção)
    """
    # Buscar pedidos pendentes e em produção
    pedidos = await db.pedidos.find(
        {"status": {"$in": ["pendente", "em_producao", "em_embalagem"]}},
        {"_id": 0}
    ).to_list(1000)
    
    # Agrupar por produto
    produtos_agrupados = {}
    for pedido in pedidos:
        for item in pedido.get('items', []):
            produto_nome = item.get('produto_nome', 'Produto Desconhecido')
            quantidade = item.get('quantidade', 0)
            
            if produto_nome not in produtos_agrupados:
                produtos_agrupados[produto_nome] = {
                    'produto_nome': produto_nome,
                    'quantidade_total': 0,
                    'valor_total': 0,
                    'pedidos_count': 0
                }
            
            produtos_agrupados[produto_nome]['quantidade_total'] += quantidade
            produtos_agrupados[produto_nome]['valor_total'] += item.get('subtotal', 0)
            produtos_agrupados[produto_nome]['pedidos_count'] += 1
    
    resultado = list(produtos_agrupados.values())
    resultado.sort(key=lambda x: x['quantidade_total'], reverse=True)
    
    return {
        "total_tipos_produto": len(resultado),
        "quantidade_total": sum(p['quantidade_total'] for p in resultado),
        "valor_total": sum(p['valor_total'] for p in resultado),
        "itens": resultado
    }

# ============ NF DE ENTRADA ============

# Importar ElementTree para parsing XML
import xml.etree.ElementTree as ET

@api_router.post("/nf-entrada/parse-xml")
async def parse_nf_xml(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Parse XML da NF-e (formato nativo da Nota Fiscal Eletrônica)
    Extrai todos os dados: Emitente, Itens (NCM, CST, CFOP), Totais, etc.
    """
    try:
        # Ler o body da requisição
        xml_content = await request.body()
        xml_content = xml_content.decode('utf-8').strip()
        
        # Remove BOM
        if xml_content.startswith('\ufeff'):
            xml_content = xml_content[1:]
        
        if not xml_content:
            raise HTTPException(status_code=400, detail="XML vazio")
        
        # Registrar namespace default para evitar problemas
        namespaces = {
            'nfe': 'http://www.portalfiscal.inf.br/nfe',
            '': 'http://www.portalfiscal.inf.br/nfe'
        }
        
        # Parse XML
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as pe:
            logging.error(f"XML Parse Error: {pe}")
            raise HTTPException(status_code=400, detail=f"XML inválido: {str(pe)}")
        
        # Função para encontrar elemento considerando namespace
        def find_elem(parent, tag_name):
            if parent is None:
                return None
            
            # Tentar busca direta com namespace
            ns_url = 'http://www.portalfiscal.inf.br/nfe'
            elem = parent.find(f'.//{{{ns_url}}}{tag_name}')
            
            if elem is None:
                # Tentar busca sem namespace
                elem = parent.find(f'.//{tag_name}')
            
            if elem is None:
                # Busca recursiva por tag que termina com o nome
                for child in parent.iter():
                    tag = child.tag
                    # Remover namespace do tag para comparação
                    if '}' in tag:
                        tag = tag.split('}')[1]
                    if tag == tag_name:
                        return child
            
            return elem
        
        def get_text(parent, tag_name, default=""):
            if parent is None:
                return default
            elem = find_elem(parent, tag_name)
            if elem is not None and elem.text:
                return elem.text.strip()
            return default
        
        def get_attr(elem, attr_name, default=""):
            if elem is None:
                return default
            return elem.get(attr_name, default)
        
        # ===== CHAVE DE ACESSO =====
        chave_acesso = ""
        infNFe = find_elem(root, 'infNFe')
        if infNFe is not None:
            chave_acesso = get_attr(infNFe, 'Id', '').replace('NFe', '')
        
        # ===== IDENTIFICAÇÃO =====
        ide = find_elem(root, 'ide')
        numero_nf = get_text(ide, 'nNF') if ide is not None else ""
        serie = get_text(ide, 'serie') if ide is not None else ""
        data_emissao_raw = get_text(ide, 'dhEmi') if ide is not None else ""
        
        # Converter data
        data_emissao = ""
        if data_emissao_raw:
            try:
                # Formato: 2026-03-17T17:37:28-03:00
                data_emissao = data_emissao_raw.split('T')[0]
            except:
                data_emissao = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        
        # ===== EMITENTE (FORNECEDOR) =====
        emit = find_elem(root, 'emit')
        fornecedor_cnpj = get_text(emit, 'CNPJ') if emit is not None else ""
        fornecedor_nome = get_text(emit, 'xNome') if emit is not None else ""
        fornecedor_ie = get_text(emit, 'IE') if emit is not None else ""
        
        # Endereço do emitente
        enderEmit = find_elem(emit, 'enderEmit') if emit is not None else None
        fornecedor_endereco = ""
        fornecedor_municipio = ""
        fornecedor_uf = ""
        fornecedor_cep = ""
        fornecedor_telefone = ""
        
        if enderEmit is not None:
            logradouro = get_text(enderEmit, 'xLgr')
            numero = get_text(enderEmit, 'nro')
            complemento = get_text(enderEmit, 'xCpl')
            bairro = get_text(enderEmit, 'xBairro')
            
            partes_end = [logradouro]
            if numero:
                partes_end.append(f"nº {numero}")
            if complemento:
                partes_end.append(complemento)
            if bairro:
                partes_end.append(bairro)
            fornecedor_endereco = ", ".join(partes_end)
            
            fornecedor_municipio = get_text(enderEmit, 'xMun')
            fornecedor_uf = get_text(enderEmit, 'UF')
            fornecedor_cep = get_text(enderEmit, 'CEP')
            fornecedor_telefone = get_text(enderEmit, 'fone')
        
        # ===== ITENS =====
        items = []
        dets = root.iter()
        for elem in root.iter():
            if elem.tag.endswith('det'):
                prod = find_elem(elem, 'prod')
                imposto = find_elem(elem, 'imposto')
                
                if prod is not None:
                    item = {
                        "codigo": get_text(prod, 'cProd'),
                        "descricao": get_text(prod, 'xProd'),
                        "ncm": get_text(prod, 'NCM'),
                        "cfop": get_text(prod, 'CFOP'),
                        "unidade": get_text(prod, 'uCom', 'UN'),
                        "quantidade": float(get_text(prod, 'qCom', '0').replace(',', '.')),
                        "valor_unitario": float(get_text(prod, 'vUnCom', '0').replace(',', '.')),
                        "valor_total": float(get_text(prod, 'vProd', '0').replace(',', '.')),
                        "valor_desconto": float(get_text(prod, 'vDesc', '0').replace(',', '.')),
                        "cst": "",
                        "icms_base": 0.0,
                        "icms_valor": 0.0,
                        "ipi_valor": 0.0,
                        "pis_valor": 0.0,
                        "cofins_valor": 0.0
                    }
                    
                    # CST e ICMS
                    if imposto is not None:
                        # Procurar por qualquer tipo de ICMS (ICMS00, ICMS10, ICMS20, ICMS51, etc.)
                        icms_elem = find_elem(imposto, 'ICMS')
                        if icms_elem is not None:
                            for icms_type in icms_elem:
                                item['cst'] = get_text(icms_type, 'CST') or get_text(icms_type, 'CSOSN')
                                item['icms_base'] = float(get_text(icms_type, 'vBC', '0').replace(',', '.'))
                                item['icms_valor'] = float(get_text(icms_type, 'vICMS', '0').replace(',', '.'))
                                break
                        
                        # IPI
                        ipi_elem = find_elem(imposto, 'IPI')
                        if ipi_elem is not None:
                            item['ipi_valor'] = float(get_text(ipi_elem, 'vIPI', '0').replace(',', '.'))
                        
                        # PIS
                        pis_elem = find_elem(imposto, 'PIS')
                        if pis_elem is not None:
                            item['pis_valor'] = float(get_text(pis_elem, 'vPIS', '0').replace(',', '.'))
                        
                        # COFINS
                        cofins_elem = find_elem(imposto, 'COFINS')
                        if cofins_elem is not None:
                            item['cofins_valor'] = float(get_text(cofins_elem, 'vCOFINS', '0').replace(',', '.'))
                    
                    items.append(item)
        
        # ===== TOTAIS =====
        icmsTot = find_elem(root, 'ICMSTot')
        valor_produtos = float(get_text(icmsTot, 'vProd', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_frete = float(get_text(icmsTot, 'vFrete', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_seguro = float(get_text(icmsTot, 'vSeg', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_outras = float(get_text(icmsTot, 'vOutro', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_desconto = float(get_text(icmsTot, 'vDesc', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_ipi = float(get_text(icmsTot, 'vIPI', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_icms = float(get_text(icmsTot, 'vICMS', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_pis = float(get_text(icmsTot, 'vPIS', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_cofins = float(get_text(icmsTot, 'vCOFINS', '0').replace(',', '.')) if icmsTot is not None else 0.0
        valor_total = float(get_text(icmsTot, 'vNF', '0').replace(',', '.')) if icmsTot is not None else 0.0
        
        # ===== INFORMAÇÕES COMPLEMENTARES =====
        infAdic = find_elem(root, 'infAdic')
        info_complementares = get_text(infAdic, 'infCpl') if infAdic is not None else ""
        
        return {
            "success": True,
            "source": "xml",
            "data": {
                "chave_acesso": chave_acesso,
                "numero_nf": numero_nf,
                "serie": serie,
                "data_emissao": data_emissao,
                "fornecedor_cnpj": fornecedor_cnpj,
                "fornecedor_nome": fornecedor_nome,
                "fornecedor_ie": fornecedor_ie,
                "fornecedor_endereco": fornecedor_endereco,
                "fornecedor_municipio": fornecedor_municipio,
                "fornecedor_uf": fornecedor_uf,
                "fornecedor_cep": fornecedor_cep,
                "fornecedor_telefone": fornecedor_telefone,
                "items": items,
                "valor_produtos": valor_produtos,
                "valor_frete": valor_frete,
                "valor_seguro": valor_seguro,
                "valor_outras": valor_outras,
                "valor_desconto": valor_desconto,
                "valor_ipi": valor_ipi,
                "valor_icms": valor_icms,
                "valor_pis": valor_pis,
                "valor_cofins": valor_cofins,
                "valor_total": valor_total,
                "informacoes_complementares": info_complementares
            }
        }
    except ET.ParseError as e:
        logging.error(f"Erro ao parsear XML da NF-e: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao processar XML: formato inválido")
    except Exception as e:
        logging.error(f"Erro ao parsear XML da NF-e: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao processar XML: {str(e)}")

# ============ NF DE ENTRADA (CRUD) ============
import re
from bs4 import BeautifulSoup

@api_router.get("/nf-entrada")
async def listar_nf_entrada(current_user: dict = Depends(get_current_user)):
    nfs = await db.nf_entrada.find({}, {"_id": 0}).sort("data_entrada", -1).to_list(1000)
    for nf in nfs:
        if isinstance(nf.get('data_emissao'), str):
            nf['data_emissao'] = datetime.fromisoformat(nf['data_emissao'])
        if isinstance(nf.get('data_entrada'), str):
            nf['data_entrada'] = datetime.fromisoformat(nf['data_entrada'])
    return nfs

@api_router.post("/nf-entrada")
async def criar_nf_entrada(nf_data: NFEntradaCreate, current_user: dict = Depends(get_current_user)):
    # Verificar se já existe NF com essa chave de acesso
    existing = await db.nf_entrada.find_one({"chave_acesso": nf_data.chave_acesso}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="NF-e já registrada com essa chave de acesso")
    
    nf = NFEntrada(
        chave_acesso=nf_data.chave_acesso,
        numero_nf=nf_data.numero_nf,
        serie=nf_data.serie,
        data_emissao=datetime.fromisoformat(nf_data.data_emissao),
        fornecedor_cnpj=nf_data.fornecedor_cnpj,
        fornecedor_nome=nf_data.fornecedor_nome,
        fornecedor_ie=nf_data.fornecedor_ie,
        fornecedor_endereco=nf_data.fornecedor_endereco,
        fornecedor_municipio=nf_data.fornecedor_municipio,
        fornecedor_uf=nf_data.fornecedor_uf,
        fornecedor_cep=nf_data.fornecedor_cep,
        fornecedor_telefone=nf_data.fornecedor_telefone,
        items=[ItemNFEntrada(**item.model_dump()) for item in nf_data.items],
        valor_produtos=nf_data.valor_produtos,
        valor_frete=nf_data.valor_frete,
        valor_seguro=nf_data.valor_seguro,
        valor_outras=nf_data.valor_outras,
        valor_desconto=nf_data.valor_desconto,
        valor_ipi=nf_data.valor_ipi,
        valor_icms=nf_data.valor_icms,
        valor_pis=nf_data.valor_pis,
        valor_cofins=nf_data.valor_cofins,
        valor_total=nf_data.valor_total,
        informacoes_complementares=nf_data.informacoes_complementares,
        observacoes=nf_data.observacoes
    )
    
    doc = nf.model_dump()
    doc['data_emissao'] = doc['data_emissao'].isoformat()
    doc['data_entrada'] = doc['data_entrada'].isoformat()
    await db.nf_entrada.insert_one(doc)
    
    return {"message": "NF-e registrada com sucesso", "id": nf.id}

@api_router.post("/nf-entrada/parse-html")
async def parse_nf_html(html_content: str = "", current_user: dict = Depends(get_current_user)):
    """
    Parse HTML da página de consulta da NF-e do portal da fazenda
    Extrai todos os dados: Emitente, Itens (NCM, CST, CFOP), Totais, etc.
    """
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        text = soup.get_text()
        
        # ===== CHAVE DE ACESSO =====
        chave_acesso = ""
        chave_match = re.search(r'(\d{44})', text.replace(' ', '').replace('\n', ''))
        if chave_match:
            chave_acesso = chave_match.group(1)
        
        # Se não encontrar, procurar em elementos específicos
        if not chave_acesso:
            for elem in soup.find_all(['span', 'div', 'td', 'input']):
                elem_text = elem.get_text() if hasattr(elem, 'get_text') else str(elem.get('value', ''))
                match = re.search(r'(\d{44})', elem_text.replace(' ', ''))
                if match:
                    chave_acesso = match.group(1)
                    break
        
        # ===== DADOS DO EMITENTE (FORNECEDOR) =====
        fornecedor_nome = ""
        fornecedor_cnpj = ""
        fornecedor_ie = ""
        fornecedor_endereco = ""
        fornecedor_municipio = ""
        fornecedor_uf = ""
        fornecedor_cep = ""
        fornecedor_telefone = ""
        
        # Procurar seção do emitente
        emitente_patterns = [
            r'Emitente',
            r'EMITENTE',
            r'Dados do Emitente',
            r'Identificação do Emitente'
        ]
        
        for pattern in emitente_patterns:
            section = soup.find(string=re.compile(pattern, re.I))
            if section:
                parent = section.find_parent(['div', 'fieldset', 'table', 'section'])
                if parent:
                    section_text = parent.get_text()
                    
                    # CNPJ
                    cnpj_match = re.search(r'CNPJ[:\s]*(\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2})', section_text, re.I)
                    if cnpj_match:
                        fornecedor_cnpj = re.sub(r'[^\d]', '', cnpj_match.group(1))
                    
                    # IE
                    ie_match = re.search(r'Inscri[çc][aã]o Estadual[:\s]*(\d+)', section_text, re.I)
                    if ie_match:
                        fornecedor_ie = ie_match.group(1)
                    
                    # Razão Social/Nome
                    nome_match = re.search(r'(?:Raz[aã]o Social|Nome)[:\s]*([^\n\r]+)', section_text, re.I)
                    if nome_match:
                        fornecedor_nome = nome_match.group(1).strip()[:200]
                    
                    # Endereço
                    end_match = re.search(r'Endere[çc]o[:\s]*([^\n\r]+)', section_text, re.I)
                    if end_match:
                        fornecedor_endereco = end_match.group(1).strip()
                    
                    # Município
                    mun_match = re.search(r'Munic[íi]pio[:\s]*([^\n\r]+)', section_text, re.I)
                    if mun_match:
                        fornecedor_municipio = mun_match.group(1).strip()
                    
                    # UF
                    uf_match = re.search(r'\bUF[:\s]*([A-Z]{2})\b', section_text)
                    if uf_match:
                        fornecedor_uf = uf_match.group(1)
                    
                    # CEP
                    cep_match = re.search(r'CEP[:\s]*(\d{5}-?\d{3})', section_text, re.I)
                    if cep_match:
                        fornecedor_cep = cep_match.group(1)
                    
                    # Telefone
                    tel_match = re.search(r'(?:Telefone|Fone)[:\s]*([\d\s\-\(\)]+)', section_text, re.I)
                    if tel_match:
                        fornecedor_telefone = tel_match.group(1).strip()
                    
                    break
        
        # Fallback para CNPJ se não encontrou na seção
        if not fornecedor_cnpj:
            cnpj_matches = re.findall(r'(\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2})', text)
            if cnpj_matches:
                fornecedor_cnpj = re.sub(r'[^\d]', '', cnpj_matches[0])
        
        # ===== NÚMERO E SÉRIE =====
        numero_nf = ""
        serie = ""
        
        # Número
        numero_patterns = [
            r'N[uú]mero[:\s]*(\d+)',
            r'NF[:\s-]*(\d+)',
            r'Nota Fiscal[:\s]*(\d+)'
        ]
        for pattern in numero_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                numero_nf = match.group(1)
                break
        
        # Série
        serie_match = re.search(r'S[eé]rie[:\s]*(\d+)', text, re.I)
        if serie_match:
            serie = serie_match.group(1)
        
        # ===== DATA DE EMISSÃO =====
        data_emissao = ""
        data_patterns = [
            r'Data de Emiss[aã]o[:\s]*(\d{2}/\d{2}/\d{4})',
            r'Emiss[aã]o[:\s]*(\d{2}/\d{2}/\d{4})',
            r'Data[:\s]*(\d{2}/\d{2}/\d{4})'
        ]
        for pattern in data_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                try:
                    data_emissao = datetime.strptime(match.group(1), '%d/%m/%Y').isoformat()
                    break
                except:
                    pass
        
        if not data_emissao:
            data_emissao = datetime.now(timezone.utc).isoformat()
        
        # ===== VALORES TOTAIS =====
        valor_produtos = 0.0
        valor_frete = 0.0
        valor_seguro = 0.0
        valor_outras = 0.0
        valor_desconto = 0.0
        valor_ipi = 0.0
        valor_icms = 0.0
        valor_pis = 0.0
        valor_cofins = 0.0
        valor_total = 0.0
        
        # Extrair valores usando padrões específicos
        def extract_valor(pattern, txt):
            match = re.search(pattern, txt, re.I)
            if match:
                valor_str = match.group(1).replace('.', '').replace(',', '.')
                try:
                    return float(valor_str)
                except:
                    return 0.0
            return 0.0
        
        valor_produtos = extract_valor(r'(?:Valor Total dos Produtos|BC do ICMS)[:\s]*R?\$?\s*([\d.,]+)', text)
        valor_frete = extract_valor(r'(?:Valor do Frete|Frete)[:\s]*R?\$?\s*([\d.,]+)', text)
        valor_seguro = extract_valor(r'(?:Valor do Seguro|Seguro)[:\s]*R?\$?\s*([\d.,]+)', text)
        valor_outras = extract_valor(r'(?:Outras Despesas|Despesas Acess[óo]rias)[:\s]*R?\$?\s*([\d.,]+)', text)
        valor_desconto = extract_valor(r'(?:Valor do Desconto|Desconto)[:\s]*R?\$?\s*([\d.,]+)', text)
        valor_ipi = extract_valor(r'(?:Valor Total do IPI|IPI)[:\s]*R?\$?\s*([\d.,]+)', text)
        valor_icms = extract_valor(r'(?:Valor Total do ICMS|ICMS)[:\s]*R?\$?\s*([\d.,]+)', text)
        valor_pis = extract_valor(r'(?:Valor do PIS|PIS)[:\s]*R?\$?\s*([\d.,]+)', text)
        valor_cofins = extract_valor(r'(?:Valor do COFINS|COFINS)[:\s]*R?\$?\s*([\d.,]+)', text)
        valor_total = extract_valor(r'(?:Valor Total da NF|Valor Total)[:\s]*R?\$?\s*([\d.,]+)', text)
        
        if valor_total == 0 and valor_produtos > 0:
            valor_total = valor_produtos + valor_frete + valor_seguro + valor_outras - valor_desconto + valor_ipi
        
        # ===== ITENS DA NF =====
        items = []
        
        # Procurar tabela de produtos
        tables = soup.find_all('table')
        for table in tables:
            headers = [th.get_text().strip().lower() for th in table.find_all('th')]
            header_str = ' '.join(headers)
            
            # Verificar se é tabela de produtos
            if any(h in header_str for h in ['descri', 'produto', 'item', 'ncm', 'cfop']):
                rows = table.find_all('tr')
                
                # Mapear colunas
                col_map = {}
                for i, h in enumerate(headers):
                    h_lower = h.lower()
                    if 'c[óo]d' in h_lower or 'código' in h_lower or h_lower == 'cod':
                        col_map['codigo'] = i
                    elif 'descri' in h_lower or 'produto' in h_lower:
                        col_map['descricao'] = i
                    elif 'ncm' in h_lower:
                        col_map['ncm'] = i
                    elif 'cst' in h_lower or 'csosn' in h_lower:
                        col_map['cst'] = i
                    elif 'cfop' in h_lower:
                        col_map['cfop'] = i
                    elif 'un' in h_lower or 'unid' in h_lower:
                        col_map['unidade'] = i
                    elif 'qtd' in h_lower or 'quant' in h_lower:
                        col_map['quantidade'] = i
                    elif 'unit' in h_lower or 'vl.unit' in h_lower:
                        col_map['valor_unitario'] = i
                    elif 'total' in h_lower or 'subtotal' in h_lower:
                        col_map['valor_total'] = i
                    elif 'desc' in h_lower and 'descri' not in h_lower:
                        col_map['desconto'] = i
                    elif 'icms' in h_lower and 'bc' not in h_lower:
                        col_map['icms'] = i
                    elif 'ipi' in h_lower:
                        col_map['ipi'] = i
                
                # Processar linhas
                for row in rows[1:]:  # Pular header
                    cols = row.find_all(['td', 'th'])
                    if len(cols) < 3:
                        continue
                    
                    try:
                        item = {
                            "codigo": "",
                            "descricao": "",
                            "ncm": "",
                            "cst": "",
                            "cfop": "",
                            "unidade": "UN",
                            "quantidade": 1.0,
                            "valor_unitario": 0.0,
                            "valor_total": 0.0,
                            "valor_desconto": 0.0,
                            "icms_valor": 0.0,
                            "ipi_valor": 0.0
                        }
                        
                        def get_col_value(col_name, default=""):
                            if col_name in col_map and col_map[col_name] < len(cols):
                                return cols[col_map[col_name]].get_text().strip()
                            return default
                        
                        def get_col_number(col_name, default=0.0):
                            val = get_col_value(col_name, "0")
                            val = re.sub(r'[^\d.,]', '', val).replace(',', '.')
                            try:
                                return float(val) if val else default
                            except:
                                return default
                        
                        item['codigo'] = get_col_value('codigo')
                        item['descricao'] = get_col_value('descricao')
                        item['ncm'] = get_col_value('ncm')
                        item['cst'] = get_col_value('cst')
                        item['cfop'] = get_col_value('cfop')
                        item['unidade'] = get_col_value('unidade', 'UN')
                        item['quantidade'] = get_col_number('quantidade', 1.0)
                        item['valor_unitario'] = get_col_number('valor_unitario')
                        item['valor_total'] = get_col_number('valor_total')
                        item['valor_desconto'] = get_col_number('desconto')
                        item['icms_valor'] = get_col_number('icms')
                        item['ipi_valor'] = get_col_number('ipi')
                        
                        # Calcular valor unitário se não tiver
                        if item['valor_unitario'] == 0 and item['quantidade'] > 0 and item['valor_total'] > 0:
                            item['valor_unitario'] = round(item['valor_total'] / item['quantidade'], 4)
                        
                        # Só adicionar se tiver descrição e valor
                        if item['descricao'] and item['valor_total'] > 0:
                            items.append(item)
                    except Exception as e:
                        logging.warning(f"Erro ao processar linha de item: {e}")
                        continue
                
                if items:
                    break
        
        # ===== INFORMAÇÕES COMPLEMENTARES =====
        info_complementares = ""
        info_section = soup.find(string=re.compile(r'Informa[çc][õo]es Complementares', re.I))
        if info_section:
            parent = info_section.find_parent(['div', 'fieldset', 'td'])
            if parent:
                info_complementares = parent.get_text().strip()[:1000]
        
        return {
            "success": True,
            "data": {
                "chave_acesso": chave_acesso,
                "numero_nf": numero_nf,
                "serie": serie,
                "data_emissao": data_emissao,
                "fornecedor_cnpj": fornecedor_cnpj,
                "fornecedor_nome": fornecedor_nome,
                "fornecedor_ie": fornecedor_ie,
                "fornecedor_endereco": fornecedor_endereco,
                "fornecedor_municipio": fornecedor_municipio,
                "fornecedor_uf": fornecedor_uf,
                "fornecedor_cep": fornecedor_cep,
                "fornecedor_telefone": fornecedor_telefone,
                "items": items,
                "valor_produtos": valor_produtos,
                "valor_frete": valor_frete,
                "valor_seguro": valor_seguro,
                "valor_outras": valor_outras,
                "valor_desconto": valor_desconto,
                "valor_ipi": valor_ipi,
                "valor_icms": valor_icms,
                "valor_pis": valor_pis,
                "valor_cofins": valor_cofins,
                "valor_total": valor_total,
                "informacoes_complementares": info_complementares
            }
        }
    except Exception as e:
        logging.error(f"Erro ao parsear HTML da NF-e: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao processar HTML: {str(e)}")

@api_router.post("/nf-entrada/parse-chave")
async def parse_chave_acesso(chave: str, current_user: dict = Depends(get_current_user)):
    """
    Extrai informações básicas da chave de acesso da NF-e (44 dígitos)
    Formato: UF(2) + AAMM(4) + CNPJ(14) + MOD(2) + SERIE(3) + NUMERO(9) + FORMA(1) + CODIGO(8) + DV(1)
    """
    chave = chave.replace(' ', '').replace('.', '').replace('-', '')
    
    if len(chave) != 44 or not chave.isdigit():
        raise HTTPException(status_code=400, detail="Chave de acesso inválida. Deve conter 44 dígitos numéricos.")
    
    # Verificar se já existe
    existing = await db.nf_entrada.find_one({"chave_acesso": chave}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="NF-e já registrada com essa chave de acesso")
    
    # Extrair informações da chave
    uf = chave[0:2]
    ano_mes = chave[2:6]
    cnpj = chave[6:20]
    modelo = chave[20:22]
    serie = chave[22:25]
    numero = chave[25:34]
    
    # Formatar CNPJ
    cnpj_formatado = f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:14]}"
    
    # Formatar data (AAMM -> MM/20AA)
    ano = f"20{ano_mes[:2]}"
    mes = ano_mes[2:4]
    data_emissao = f"{ano}-{mes}-01"
    
    # Remover zeros à esquerda do número
    numero_nf = str(int(numero))
    serie_nf = str(int(serie))
    
    return {
        "success": True,
        "data": {
            "chave_acesso": chave,
            "uf": uf,
            "cnpj": cnpj,
            "cnpj_formatado": cnpj_formatado,
            "modelo": modelo,
            "serie": serie_nf,
            "numero_nf": numero_nf,
            "data_emissao": data_emissao,
        }
    }

@api_router.delete("/nf-entrada/{nf_id}")
async def deletar_nf_entrada(nf_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.nf_entrada.delete_one({"id": nf_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="NF-e não encontrada")
    return {"message": "NF-e removida com sucesso"}

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