# Sussu Chocolates - Sistema de Gestão
## Product Requirements Document (PRD)

### Original Problem Statement
Criar um aplicativo/sistema de controle contendo: Cadastro Cliente, Pedido, Produção, Embalagem, Estoque, Venda, Emissão de Cupom Fiscal. Que possa gerar relatórios e controles. Trata-se de uma fábrica de chocolates artesanais chamada Sussu Chocolates.

### Tech Stack
- **Frontend**: React.js, Tailwind CSS, Shadcn/UI, Recharts
- **Backend**: FastAPI, Motor (Async MongoDB), Pydantic, BeautifulSoup4
- **Database**: MongoDB
- **Authentication**: JWT

---

## Implemented Features

### Core Modules (Complete)

| Module | Status | Description |
|--------|--------|-------------|
| **Login/Auth** | ✅ Done | JWT authentication with email/password |
| **Dashboard** | ✅ Done | Overview with stats and quick actions |
| **Clientes** | ✅ Done | Full CRUD for customers |
| **Produtos** | ✅ Done | Full CRUD for chocolate products |
| **Pedidos** | ✅ Done | Orders management with status workflow |
| **Produção** | ✅ Done | Production tracking with order linking |
| **Embalagem** | ✅ Done | Packaging workflow with responsible tracking |
| **Estoque** | ✅ Done | Inventory with location tracking |
| **Vendas** | ✅ Done | Sales recording |
| **Lucratividade** | ✅ Done | Profitability analysis |
| **Compras** | ✅ Done | Complete purchasing module |
| **Relatórios** | ✅ Done | Basic reports |

### Compras Module (Latest Implementation)

#### Fornecedores (Suppliers)
- ✅ CRUD completo
- ✅ Cadastro com CNPJ, contato, endereço

#### Insumos (Raw Materials)
- ✅ CRUD completo
- ✅ Controle de estoque mínimo
- ✅ Vinculação com fornecedores
- ✅ Alertas de estoque baixo

#### Pedidos de Compra (Purchase Orders)
- ✅ Criação de pedidos
- ✅ Múltiplos itens por pedido
- ✅ Status workflow (pendente → aprovada → recebida)
- ✅ Atualização automática de estoque ao receber

#### NF de Entrada (Inbound Invoice) - NEW
- ✅ **3 formas de importação**:
  1. Chave de Acesso (44 dígitos) - extração automática
  2. Importar HTML do portal SEFAZ
  3. Entrada manual completa
- ✅ Parse automático da chave (número, série, data, CNPJ)
- ✅ Parse de HTML da consulta NF-e
- ✅ Registro de itens com valores
- ✅ Visualização de detalhes
- ✅ Exclusão de NF

### Production Features
- ✅ Iniciar produção a partir de pedidos
- ✅ Produção para estoque (sem pedido inicial)
- ✅ Seleção de múltiplos produtos com quantidades
- ✅ Auto-seleção de itens do pedido
- ✅ "Iniciar Todos" para bulk start
- ✅ Relatório de produção pendente

### Packaging Features
- ✅ Workflow de embalagem vinculado à produção
- ✅ Número do pedido e nome do cliente visíveis
- ✅ Campo "Responsável pela conclusão"
- ✅ Localização de armazenamento

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register

### Core CRUD
- `/api/clientes` - Customers
- `/api/produtos` - Products
- `/api/pedidos` - Orders
- `/api/producao` - Production
- `/api/embalagem` - Packaging
- `/api/estoque` - Inventory
- `/api/vendas` - Sales

### Compras
- `/api/fornecedores` - Suppliers CRUD
- `/api/insumos` - Raw materials CRUD
- `/api/compras` - Purchase orders CRUD
- `PATCH /api/compras/{id}/status` - Update status

### NF de Entrada (NEW)
- `GET /api/nf-entrada` - List all
- `POST /api/nf-entrada` - Create
- `POST /api/nf-entrada/parse-html` - Parse SEFAZ HTML
- `POST /api/nf-entrada/parse-chave` - Parse access key
- `DELETE /api/nf-entrada/{id}` - Delete

---

## Database Schema

### nf_entrada (NEW)
```javascript
{
  id: string,
  chave_acesso: string (44 digits),
  numero_nf: string,
  serie: string,
  data_emissao: datetime,
  data_entrada: datetime,
  fornecedor_cnpj: string,
  fornecedor_nome: string,
  fornecedor_endereco: string,
  items: [{descricao, quantidade, valor_unitario, valor_total, unidade}],
  valor_produtos: float,
  valor_frete: float,
  valor_desconto: float,
  valor_total: float,
  status: string (registrada/conferida/estornada),
  observacoes: string
}
```

---

## Backlog / Future Tasks

### P1 (High Priority)
- [ ] Implementar NFC-e real para Vendas (integração SEFAZ)

### P2 (Medium Priority)
- [ ] Gráficos/Charts na página de Relatórios (Recharts)
- [ ] Filtros avançados em todas as telas
- [ ] Exportação PDF/Excel para relatórios

### P3 (Low Priority)
- [ ] Refatorar server.py (~1700 linhas) em routers separados
- [ ] Otimizar componentes React grandes
- [ ] Dashboard com métricas em tempo real

---

## Test Credentials
- **Admin**: admin@sussu.com / admin123

## URLs
- **Preview**: https://sussu-manage.preview.emergentagent.com
- **API Base**: https://sussu-manage.preview.emergentagent.com/api

---

*Last updated: March 27, 2026*
