# Sussu Chocolates - Sistema de Gestão

## Problema Original
Criar um aplicativo/sistema de controle para fábrica de chocolates artesanais contendo:
- Cadastro de Clientes
- Pedidos
- Produção
- Embalagem
- Estoque
- Vendas
- Emissão de Cupom Fiscal (NFC-e)
- Relatórios e controles

## Módulos Implementados

### Core
- [x] Autenticação JWT com login email/senha
- [x] Dashboard com visão geral
- [x] Cadastro de Clientes
- [x] Cadastro de Produtos
- [x] Gestão de Pedidos
- [x] Produção
- [x] Embalagem
- [x] Estoque
- [x] Vendas (Venda Direta em 2 etapas)
- [x] NFC-e (Homologação) - com certificado A1
- [x] Relatórios (PDF/Excel)
- [x] Configurações com RBAC

### Funcionalidades Avançadas
- [x] PWA (Progressive Web App) com suporte offline
- [x] Catálogo Público `/catalogo` para pedidos via WhatsApp
- [x] Autocomplete (SearchableSelect) em todos dropdowns
- [x] Quick Create Modals (criar cliente/produto inline)
- [x] Seleção de sabores fracionados para produtos multi-sabor
- [x] Contexto global EmpresaContext para logo dinâmico

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Shadcn/UI, Radix UI
- **Backend**: FastAPI, Motor (Async MongoDB)
- **Database**: MongoDB
- **PWA**: Service Workers, manifest.json

## Arquitetura
```
/app/
├── backend/
│   ├── routes/ (auth, clientes, pedidos, vendas, producao, estoque, nfce, catalogo, configuracoes)
│   ├── models.py
│   └── server.py
├── frontend/
│   ├── public/ (PWA files)
│   └── src/
│       ├── components/ (SearchableSelect, QuickCreateModals, SelecionarSaboresModal, PWAInstallPrompt)
│       ├── contexts/ (AuthContext, EmpresaContext)
│       └── pages/
```

## Credenciais de Teste
- Email: admin@sussu.com
- Senha: 123456

## Dados da Empresa
- Nome: Sussu Chocolates
- Telefone: (43) 99967-6206
- Endereço: Rua Quintino Bocaiuva, 737, Centro, Jacarezinho/PR

## Sabores Disponíveis
Brigadeiro, Beijinho, Maracujá, Cereja, Morango, Limão, Ninho, Nutella, Pistache, Amendoim, Coco, Doce de Leite, Café, Churros, Oreo, Paçoca, Chocolate Branco, Chocolate ao Leite, Chocolate Meio Amargo, Prestígio, Tradicional, Amarula, Ovomaltine

## Tasks Pendentes

### P0 - Concluído ✅
- [x] Venda Mista (Entrega Imediata + A Produzir) - VendasPage.js

### P1 - Próximas
- [ ] Alertas automáticos de estoque baixo

### P2 - Backlog
- [ ] Migrar NFC-e para Produção (requer CSC de produção)
- [ ] Refatorar VendasPage.js (1500+ linhas) em componentes menores

## Changelog

### 2025-12-30 (Sessão 3)
- **P0 COMPLETO**: Venda Mista implementada
  - Backend: tipo_entrega em ItemPedido, tem_itens_a_produzir em Venda
  - Backend: venda_vinculada_id e origem em Pedido
  - Backend: Movimentação de estoque apenas para itens 'imediata'
  - Frontend: Formulário em 2 etapas com botões Entrega Imediata / A Produzir
  - Frontend: Badge "Produção" na lista de vendas
  - Testes: 10/10 backend, todos frontend passaram

### 2025-12-30 (Sessão 1)
- Atualizado telefone da empresa para (43) 99967-6206
- Adicionados sabores: Prestígio, Tradicional, Amarula, Ovomaltine

### Sessões Anteriores
- Implementado PWA completo
- Criado Catálogo Público com WhatsApp
- Implementado SearchableSelect (autocomplete)
- Quick Create Modals para cliente/produto
- Modal de seleção de sabores fracionados
- Corrigido bug de fechamento de modais aninhados Radix UI
- Venda Direta refatorada em 2 etapas
- RBAC nas configurações
