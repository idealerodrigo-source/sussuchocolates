# Sussu Chocolates - Sistema de Gestão

## Changelog (2026-03-29)
- **NEW**: Módulo de Configurações completo (Usuários, Dados da Empresa, Logo)
- **NEW**: RBAC (Controle de Acesso) implementado - apenas admin acessa Configurações
- **NEW**: Logo dinâmico no sidebar usando EmpresaContext
- **NEW**: Botões "Novo Cliente" e "Novo Produto" nos formulários de Pedidos e Vendas (criação rápida sem sair do modal)
- **FIXED**: Bug de serialização ObjectId no POST de usuários

## Changelog (2026-03-28)
- **REFACTOR**: Migração COMPLETA do backend para estrutura modular (2500 linhas → 17 arquivos menores)
- **NEW**: Cancelamento de vendas com devolução automática dos itens ao estoque
- **NEW**: Campo de pesquisa em Vendas (filtra por cliente, pedido, produto, forma de pagamento)
- **NEW**: Opção de parcelamento (1x a 12x) quando forma de pagamento é Cartão de Crédito
- **FIXED**: Botão "Concluir Selecionados" na Embalagem não fica mais coberto pelo logo
- **FIXED**: Relatórios de Vendas e Produção Geral agora carregam automaticamente ao acessar a aba (antes exigiam clique manual no botão "Gerar Relatório")
## Product Requirements Document (PRD)

### Original Problem Statement
Criar um aplicativo/sistema de controle contendo: Cadastro Cliente, Pedido, Produção, Embalagem, Estoque, Venda, Emissão de Cupom Fiscal. Que possa gerar relatórios e controles. Trata-se de uma fábrica de chocolates artesanais chamada Sussu Chocolates.

### Tech Stack
- **Frontend**: React.js, Tailwind CSS, Shadcn/UI, Recharts, jsPDF, xlsx
- **Backend**: FastAPI, Motor (Async MongoDB), Pydantic, BeautifulSoup4, pynfe, cryptography
- **Database**: MongoDB
- **Authentication**: JWT
- **PWA**: Service Workers, Web App Manifest

---

## Implemented Features

### Core Modules (Complete)

| Module | Status | Description |
|--------|--------|-------------|
| **Login/Auth** | ✅ Done | JWT authentication with email/password |
| **Dashboard** | ✅ Done | Overview with stats and quick actions |
| **Clientes** | ✅ Done | Full CRUD for customers |
| **Produtos** | ✅ Done | Full CRUD for chocolate products |
| **Pedidos** | ✅ Done | Orders management with PDF generation |
| **Produção** | ✅ Done | Production tracking with order linking |
| **Embalagem** | ✅ Done | Packaging workflow with responsible tracking |
| **Estoque** | ✅ Done | Inventory with location tracking |
| **Vendas** | ✅ Done | Sales recording |
| **Lucratividade** | ✅ Done | Profitability analysis |
| **Compras** | ✅ Done | Complete purchasing module |
| **Relatórios** | ✅ Done | Basic reports |
| **Configurações** | ✅ Done | Usuários, Dados Empresa, Logo |

### Configurações Module (March 29, 2026) ✅
- ✅ **Aba Usuários**: CRUD completo de usuários do sistema
  - Criar usuário com nome, email, senha, role (admin/vendedor/produção)
  - Editar dados do usuário (opcional alterar senha)
  - Excluir usuário (admin não pode excluir a si mesmo)
  - Status ativo/inativo
  - Badges coloridos por permissão
- ✅ **Aba Dados da Empresa**: Visualização e edição
  - Nome fantasia, Razão social, CNPJ, IE
  - Endereço completo (rua, número, complemento, bairro, cidade, estado, CEP)
  - Contato (telefone, email, website)
- ✅ **Aba Logo**: Upload e remoção do logo
  - Preview do logo atual
  - Upload de imagem (JPEG, PNG, GIF, WebP - máx 2MB)
  - Remoção do logo
  - Logo atualiza dinamicamente no sidebar
- ✅ **RBAC (Role-Based Access Control)**:
  - Apenas usuários admin podem acessar Configurações
  - Vendedores veem mensagem "Acesso Restrito"
  - Endpoints protegidos por verificação de role

### Pedidos - PDF Generation (March 27, 2026)
- ✅ Geração de PDF do pedido com dados completos
- ✅ Cabeçalho com logo/nome da empresa
- ✅ Dados da empresa: telefone, endereço, email
- ✅ Dados do cliente (nome, telefone, email, endereço)
- ✅ Data de entrega prevista
- ✅ Tabela de itens com quantidade e valores
- ✅ Total do pedido
- ✅ Campo de observações
- ✅ Rodapé com mensagem de agradecimento
- ✅ Botão de PDF na tabela (acesso rápido)
- ✅ Botão de PDF no modal de detalhes

**Dados da Empresa no PDF:**
- Nome: SUSSU CHOCOLATES
- Telefone: (43) 99967-6206
- Endereço: Rua Quintino Bocaiuva, 737, Jacarezinho - PR, CEP: 86400-000
- Email: sussuchocolates@hotmail.com

### NF de Entrada - Parser Completo (March 27, 2026)
- ✅ Parser HTML melhorado para extrair todos os campos:
  - Dados do Fornecedor: CNPJ, IE, Razão Social, Endereço, Município, UF, CEP, Telefone
  - Itens: Código, Descrição, NCM, CST, CFOP, Unidade, Quantidade, Valor Unitário, Total
  - Totais: Produtos, Frete, Seguro, Outras Despesas, Desconto, IPI, ICMS, PIS, COFINS, Total
  - Informações Complementares
- ✅ Formulário atualizado com campos NCM, CST, CFOP
- ✅ Visualização mostra badges para NCM/CST/CFOP nos itens

### Relatórios de Produção (March 27, 2026)
- ✅ **Itens a Produzir**: Lista de produtos pendentes de produção
  - Agrupamento por produto
  - Quantidade total por produto
  - Detalhes de quais pedidos precisam de cada produto
  - Gráfico de barras horizontal
- ✅ **Itens Produzidos**: Lista de produtos já produzidos
  - Filtro por data (início/fim)
  - Agrupamento por produto
  - Quantidade produzida por produto
  - Gráfico de barras e pizza
- ✅ **Resumo de Pedidos**: Itens dos pedidos ativos
  - Tipos de produtos, quantidade total, valor total
  - Tabela com produtos e valores

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
- `POST /api/nf-entrada/parse-xml` - Parse XML file
- `POST /api/nf-entrada/parse-chave` - Parse access key
- `DELETE /api/nf-entrada/{id}` - Delete

### Configurações
- `GET /api/configuracoes/usuarios` - List all users (admin only)
- `POST /api/configuracoes/usuarios` - Create user (admin only)
- `PUT /api/configuracoes/usuarios/{id}` - Update user (admin only)
- `DELETE /api/configuracoes/usuarios/{id}` - Delete user (admin only)
- `GET /api/configuracoes/empresa` - Get company data
- `PUT /api/configuracoes/empresa` - Update company data (admin only)
- `POST /api/configuracoes/empresa/logo` - Upload logo (admin only)
- `DELETE /api/configuracoes/empresa/logo` - Remove logo (admin only)

### NFC-e (Cupom Fiscal)
- `GET /api/nfce/configuracao` - Certificate status and config
- `GET /api/nfce/status-sefaz` - SEFAZ service status
- `POST /api/nfce/emitir` - Emit NFC-e
- `GET /api/nfce/historico` - List emitted NFC-e
- `POST /api/nfce/cancelar/{chave}` - Cancel NFC-e

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
- [ ] Criação automática de pedidos via WhatsApp
- [ ] Mudar NFC-e de Homologação para Produção (quando pronto para emissão real)

### P2 (Medium Priority)
- [ ] Alertas automáticos de estoque baixo (insumos)

### P3 (Low Priority)
- [ ] Completar implementação PWA para instalação mobile
- [ ] Dashboard com métricas em tempo real

## Recently Completed (March 27, 2026)

### NFC-e - Emissão de Cupom Fiscal (March 27, 2026) ✅
- ✅ **Integração real com SEFAZ-PR** via biblioteca `pynfe`
- ✅ **Certificado Digital A1** configurado e validado
  - Titular: SUZETE CANDIDO XAVIER
  - CNPJ: 09.328.682/0001-30
  - Validade: 20/03/2027
- ✅ **CSC (Código de Segurança do Contribuinte)** configurado
  - ID: 000001
- ✅ **Ambiente: Homologação** (testes) - pronto para produção quando necessário
- ✅ **Endpoints implementados**:
  - `GET /api/nfce/configuracao` - Status do certificado e ambiente
  - `GET /api/nfce/status-sefaz` - Status do serviço SEFAZ (online/offline)
  - `POST /api/nfce/emitir` - Emissão de NFC-e
  - `GET /api/nfce/historico` - Histórico de NFC-e emitidas
  - `POST /api/nfce/cancelar/{chave}` - Cancelamento de NFC-e
- ✅ **Frontend VendasPage** com botão "Emitir NFC-e"
- ✅ **Chave de Acesso** gerada automaticamente (44 dígitos)
- ✅ **QR Code URL** gerado para consulta

### PWA - Progressive Web App (March 27, 2026) ✅
- ✅ Manifest.json configurado para instalação
- ✅ Service Worker para cache e offline
- ✅ Ícones em múltiplas resoluções
- ✅ Instalável em dispositivos móveis

### Outras Implementações Recentes ✅
- ✅ Parser XML de NF-e com todos os campos (NCM, CST, CFOP)
- ✅ Upload de arquivo XML com drag-and-drop
- ✅ Exportação PDF/Excel para todos os relatórios
- ✅ Relatórios de Itens a Produzir e Itens Produzidos
- ✅ Geração de PDF para Pedidos com logo da empresa

---

## Test Credentials
- **Admin**: rodrigo_busatta@hotmail.com / admin123

## URLs
- **Preview**: https://sussu-manage.preview.emergentagent.com
- **API Base**: https://sussu-manage.preview.emergentagent.com/api

---

*Last updated: March 29, 2026*
*NFC-e integration: Homologação mode (SEFAZ-PR)*
