"""
All Pydantic models for Sussu Chocolates
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid


# Enums
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
    CANCELADO = "cancelado"


class MovimentoEstoque(str, Enum):
    ENTRADA = "entrada"
    SAIDA = "saida"
    AJUSTE = "ajuste"


class StatusCompra(str, Enum):
    PENDENTE = "pendente"
    APROVADA = "aprovada"
    RECEBIDA = "recebida"
    CANCELADA = "cancelada"


# User Models
class UserRegister(BaseModel):
    nome: str
    email: str
    senha: str
    role: UserRole = UserRole.VENDEDOR


class UserLogin(BaseModel):
    email: str
    senha: str


class User(BaseModel):
    id: str
    nome: str
    email: str
    role: UserRole


# Cliente Models
class Cliente(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    observacoes: Optional[str] = None
    data_cadastro: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ClienteCreate(BaseModel):
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    observacoes: Optional[str] = None


# Produto Models
class Produto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    preco: float
    custo: float = 0.0
    estoque_minimo: int = 0
    ativo: bool = True
    data_cadastro: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProdutoCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    preco: float
    custo: float = 0.0
    estoque_minimo: int = 0


# Sabor para produtos com múltiplos sabores
class SaborItem(BaseModel):
    sabor: str
    quantidade: float


# Pedido Models
class ItemPedido(BaseModel):
    produto_id: str
    produto_nome: str
    quantidade: float
    preco_unitario: float
    subtotal: float
    desconto_tipo: Optional[str] = None
    desconto_valor: float = 0.0
    valor_desconto: float = 0.0
    sabores: Optional[List[SaborItem]] = None  # Lista de sabores com quantidades fracionadas
    tipo_entrega: Optional[str] = "imediata"  # 'imediata' ou 'a_produzir'
    ja_entregue: Optional[bool] = False  # Indica se o item já foi entregue ao cliente
    ja_separado: Optional[bool] = False  # Indica se o item foi separado do estoque (pronto para entrega)
    is_extra: Optional[bool] = False  # Indica se é item extra adicionado na venda


class Pedido(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str
    cliente_id: str
    cliente_nome: str
    cliente_telefone: Optional[str] = None
    items: List[ItemPedido]
    valor_total: float
    forma_pagamento: Optional[str] = None
    status: PedidoStatus = PedidoStatus.PENDENTE
    data_pedido: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_entrega: Optional[datetime] = None
    observacoes: Optional[str] = None
    venda_vinculada_id: Optional[str] = None  # ID da venda que gerou este pedido (venda mista)
    origem: Optional[str] = "manual"  # 'manual', 'venda_mista', etc.
    data_cancelamento: Optional[datetime] = None
    motivo_cancelamento: Optional[str] = None
    # Campos de pagamento antecipado
    status_pagamento: Optional[str] = "pendente"  # 'pendente', 'parcial', 'pago'
    valor_pago: Optional[float] = 0.0  # Valor já pago (adiantamento)
    valor_saldo: Optional[float] = None  # Saldo restante (calculado)
    pagamento_forma: Optional[str] = None  # Forma de pagamento do adiantamento
    pagamento_parcelas: Optional[int] = 1  # Número de parcelas
    data_pagamento: Optional[datetime] = None  # Data do pagamento/adiantamento
    # Localização no estoque após embalagem
    localizacao_estoque: Optional[str] = None  # Ex: "Prateleira A", "Gaveta 3", "Geladeira 1"


class PedidoCreate(BaseModel):
    cliente_id: str
    items: List[ItemPedido]
    forma_pagamento: Optional[str] = None
    data_entrega: Optional[str] = None
    observacoes: Optional[str] = None
    venda_vinculada_id: Optional[str] = None  # ID da venda que gerou este pedido (venda mista)
    origem: Optional[str] = None  # 'manual', 'venda_mista', etc.
    # Campos de pagamento antecipado
    status_pagamento: Optional[str] = "pendente"
    valor_pago: Optional[float] = 0.0
    pagamento_forma: Optional[str] = None
    pagamento_parcelas: Optional[int] = 1


class PedidoUpdate(BaseModel):
    cliente_id: Optional[str] = None
    items: Optional[List[ItemPedido]] = None
    forma_pagamento: Optional[str] = None
    data_entrega: Optional[str] = None
    observacoes: Optional[str] = None
    status: Optional[PedidoStatus] = None
    # Campos de pagamento antecipado
    status_pagamento: Optional[str] = None
    valor_pago: Optional[float] = None
    pagamento_forma: Optional[str] = None
    pagamento_parcelas: Optional[int] = None


# Producao Models
class Producao(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pedido_id: Optional[str] = None
    pedido_numero: Optional[str] = None
    produto_id: str
    produto_nome: str
    quantidade: float
    sabores: Optional[List[SaborItem]] = None  # Sabores do recheio
    data_inicio: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_conclusao: Optional[datetime] = None
    responsavel: Optional[str] = None
    observacoes: Optional[str] = None
    tipo_producao: str = "pedido"


class ProducaoCreate(BaseModel):
    pedido_id: Optional[str] = None
    produto_id: str
    quantidade: float
    sabores: Optional[List[SaborItem]] = None  # Sabores do recheio
    responsavel: Optional[str] = None
    observacoes: Optional[str] = None


# Embalagem Models
class Embalagem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    producao_id: str
    pedido_id: Optional[str] = None
    pedido_numero: Optional[str] = None
    cliente_nome: Optional[str] = None
    produto_nome: str
    quantidade: float
    sabores: Optional[List[SaborItem]] = None  # Sabores do recheio
    data_inicio: Optional[datetime] = None
    data_conclusao: Optional[datetime] = None
    responsavel: Optional[str] = None
    tipo_embalagem: Optional[str] = None


class EmbalagemCreate(BaseModel):
    producao_id: str
    pedido_id: Optional[str] = None
    quantidade: float
    responsavel: Optional[str] = None
    tipo_embalagem: Optional[str] = None


class ConcluirEmbalagemRequest(BaseModel):
    responsavel: Optional[str] = None
    localizacao: Optional[str] = None


# Estoque Models
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


# Forma de Pagamento para pagamentos múltiplos
class FormaPagamentoItem(BaseModel):
    tipo: str  # 'dinheiro', 'debito', 'credito', 'pix', 'boleto', etc.
    valor: float
    parcelas: int = 1  # Apenas para crédito


# Venda Models
class Venda(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pedido_id: Optional[str] = None
    cliente_id: str
    cliente_nome: str
    items: List[ItemPedido]
    subtotal: Optional[float] = None  # Subtotal antes do desconto
    desconto_tipo: Optional[str] = None  # 'valor' ou 'percentual'
    desconto_valor: float = 0  # Valor ou percentual do desconto
    valor_desconto: float = 0  # Valor calculado do desconto
    valor_total: float
    forma_pagamento: str  # Mantido para compatibilidade (resumo ou principal)
    formas_pagamento: Optional[List[FormaPagamentoItem]] = None  # Múltiplas formas
    parcelas: int = 1
    data_venda: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    nfce_emitida: bool = False
    nfce_chave: Optional[str] = None
    nfce_numero: Optional[str] = None
    tipo_venda: str = "pedido"
    entrega_posterior: bool = False
    status_pagamento: str = "pago"
    status_venda: str = "ativa"
    data_previsao_pagamento: Optional[str] = None
    observacoes_pagamento: Optional[str] = None
    data_pagamento: Optional[datetime] = None
    data_cancelamento: Optional[datetime] = None
    motivo_cancelamento: Optional[str] = None
    tem_itens_a_produzir: bool = False  # Indica se há itens para produção
    tem_itens_extras: bool = False  # Indica se há itens extras na venda de pedido
    pedido_producao_id: Optional[str] = None  # ID do pedido gerado para produção


class VendaCreate(BaseModel):
    pedido_id: Optional[str] = None
    cliente_id: Optional[str] = None
    items: Optional[List[ItemPedido]] = None
    itens_extras: Optional[List[ItemPedido]] = None  # Itens extras para vendas de pedido
    forma_pagamento: str  # Mantido para compatibilidade
    formas_pagamento: Optional[List[FormaPagamentoItem]] = None  # Múltiplas formas
    parcelas: int = 1
    tipo_venda: str = "pedido"
    entrega_posterior: bool = False
    status_pagamento: str = "pago"
    data_previsao_pagamento: Optional[str] = None
    observacoes_pagamento: Optional[str] = None
    tem_itens_a_produzir: bool = False
    desconto_tipo: Optional[str] = None
    desconto_valor: float = 0
    valor_desconto: float = 0


class CancelarVendaRequest(BaseModel):
    motivo: Optional[str] = None


# NFC-e Models
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


# Fornecedor Models
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


# Insumo Models
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


# Compra Models
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


# NF Entrada Models
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
    status: str = "registrada"


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
