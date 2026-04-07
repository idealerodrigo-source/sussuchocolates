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
- [x] Informações de Pagamento na Criação de Pedidos

### P1 - Próximas
- [ ] Alertas automáticos de estoque baixo

### P2 - Backlog
- [ ] Migrar NFC-e para Produção (requer CSC de produção)
- [x] ~~Refatorar VendasPage.js~~ ✅ Completo (1812 → 831 linhas)

## Changelog

### 2026-04-03 (Sessão 12)
- **Nova Feature**: Adicionar Produtos Extras na Venda de Pedido
  - Ao fazer venda de um pedido existente, agora é possível adicionar produtos que não estavam no pedido original
  - Nova seção "Adicionar Produtos Extras" com visual diferenciado (roxo/indigo)
  - Busca de produtos com autocompletion
  - Seleção de tipo de entrega (Imediata ou A Produzir) para cada item extra
  - Controle de quantidade com botões +/- e input direto
  - Lista de itens extras com total calculado separadamente
  - **Backend**: Modelo `VendaCreate` recebe `itens_extras` para vendas de pedido
  - **Backend**: Modelo `ItemPedido` com campo `is_extra` para identificar itens adicionados na venda
  - **Backend**: Modelo `Venda` com campo `tem_itens_extras` para flag
  - Cálculo total: valor do pedido + valor dos extras - desconto
  - Itens extras de entrega imediata dão baixa no estoque automaticamente
- **Nova Feature**: Barra de Pesquisa ao Iniciar Produção de Pedido
  - Ao clicar em "Iniciar Produção" e selecionar "Produção com Pedido", agora há uma barra de pesquisa
  - Permite buscar por número do pedido ou nome do cliente
  - Lista de pedidos clicáveis com informações: número, quantidade de itens, nome do cliente, telefone e data de entrega
  - Filtro em tempo real conforme digita
  - Contador de pedidos encontrados
- **Nova Feature**: Filtro por Data de Entrega na Produção
  - Filtro por data de entrega ao lado da pesquisa de texto
  - Botões de acesso rápido: "Hoje", "Amanhã", "Depois de amanhã"
  - Botão "Limpar filtro" quando data selecionada
  - Combinação de filtros: texto + data funcionam juntos
- **Nova Feature**: Retornar Produção Concluída
  - Permite retornar uma produção já concluída de volta ao status "Pendente"
  - Botão "Retornar" (laranja) aparece para produções concluídas
  - Remove a embalagem pendente associada
  - Atualiza o status do pedido de volta para "em_producao"
  - Inclui confirmação antes de executar a ação
  - Valida se a embalagem já foi concluída (não permite retorno nesse caso)
  - **Backend**: Novo endpoint `PATCH /api/producao/{id}/retornar`
  - **Frontend**: Novo método `producaoAPI.retornar(id)` e handler `handleRetornarProducao`
- **Nova Feature**: Sistema de Alertas e Relatório de Estoque (P1)
  - **Nova aba "Estoque"** na página de Relatórios com:
    - Cards de resumo: Total de Alertas, Estoque Zerado, Estoque Baixo
    - Cards de saldos: Total Produtos, Zerados, Abaixo do Mínimo, Valor Total Estoque
    - Lista de produtos com estoque crítico (zerados ou abaixo do mínimo)
    - Tabela completa de saldos por produto com status visual (OK/BAIXO/ZERADO)
  - **Funcionalidade "Produzir Faltantes"**:
    - Checkboxes para selecionar itens com estoque faltante
    - Botão "Selecionar Faltantes" para seleção em lote
    - Botão "Produzir X item(ns)" para enviar selecionados para produção
    - Solicita nome do responsável antes de criar as produções
    - Cria produções de estoque (EST-XXXXXX) automaticamente
  - **Backend**: Novos endpoints:
    - `GET /api/estoque/alertas` - Retorna produtos abaixo do mínimo
    - `GET /api/estoque/relatorio-saldos` - Relatório completo de saldos
    - `POST /api/estoque/produzir-faltantes` - Cria produções em lote
- **Nova Feature**: Seleção e Conclusão em Lote de Produções
  - Checkboxes em cada linha de produção pendente
  - Checkbox no cabeçalho para selecionar/deselecionar todas
  - Barra de ações mostrando quantidade de selecionadas
  - Botão "Selecionar Todas Pendentes" para seleção rápida
  - Botão "Limpar" para deselecionar todas
  - Botão "Concluir X" para finalizar todas selecionadas de uma vez
  - Confirmação antes de executar a conclusão em lote
  - Feedback de sucesso/erro após processamento
- **Refatoração**: Extração de Componentes Reutilizáveis
  - Criado `/app/frontend/src/components/producao/PedidoSearchFilter.js` com componentes:
    - `PedidoSearchFilter`: Filtros de busca e data
    - `PedidosList`: Lista de pedidos clicáveis
  - Criado `/app/frontend/src/components/vendas/ProdutosExtrasSection.js` com componentes:
    - `ProdutosExtrasSection`: Seção de adicionar produtos extras
    - `ItensExtrasList`: Lista de itens extras adicionados
  - Criado `/app/frontend/src/components/relatorios/exportUtils.js` com funções:
    - Funções utilitárias de exportação PDF/Excel
    - `addPdfHeader`: Cabeçalho padrão da empresa nos PDFs
    - `EMPRESA` e `COLORS`: Constantes reutilizáveis
  - **Redução de código**:
    - `VendasPage.js`: 1544 → 1410 linhas (-134 linhas, -9%)
    - `ProducaoPage.js`: 1149 → 1025 linhas (-124 linhas, -11%)
    - Total reduzido: ~258 linhas de código inline

### 2026-04-01 / 2026-04-02 (Sessão 11)
- **Nova Feature COMPLETA**: Informações de Pagamento na Criação de Pedidos
  - Opções: "Não pago", "Pago Total", "Adiantamento"
  - Campos: valor pago, forma de pagamento (Dinheiro, PIX, Cartão, etc.)
  - Parcelas para cartão de crédito (1-12x)
  - Cálculo automático do saldo restante na retirada
  - Status visual: "Pendente" (cinza), "Adiantamento" (amarelo), "Pago" (verde)
  - Visualização completa na modal de detalhes do pedido
- **Bug Fix**: Corrigido problema de custo de produção zerado em produtos
  - Frontend usava campo `custo_producao` mas backend usa `custo`
  - Atualizado `ProdutosPage.js` para usar campo correto `custo`
  - Atualizado `dashboard.py` para buscar `custo` (com fallback para `custo_producao`)
  - Custo agora é salvo e exibido corretamente na lista de produtos
- **Nova Feature**: Resumo Completo do Pedido na Área de Vendas
  - Ao selecionar "Venda de Pedido": exibe resumo completo antes de finalizar
  - Mostra: número do pedido, cliente, valor total, data de entrega
  - **Status de Pagamento**: Badge visual (Pago/Adiantamento/Pendente) + valor já pago + saldo restante
  - **Itens do Pedido**: Lista com status de cada item (✓ Entregue / ◎ Separado / ○ Pendente)
  - **Sabores**: Itens de 2 sabores agora exibem "½ SABOR1 + ½ SABOR2" corretamente
  - **Observações**: Se existirem, são exibidas em destaque
  - **Alerta de saldo**: Aviso quando há valor pendente a receber
  - Para "Venda Direta": Resumo na etapa 2 com itens, tipo de entrega (Imediata/A Produzir)
- **Nova Feature**: Cálculo Automático de Adiantamento e Saldo na Venda
  - Ao finalizar venda de pedido: sistema calcula automaticamente o saldo considerando adiantamento
  - Mostra resumo visual: Total do Pedido → Desconto (se houver) → Adiantamento Pago → Saldo a Pagar
  - Se pedido já foi pago integralmente (saldo = 0): exibe mensagem "Pedido Pago Integralmente" e não exige forma de pagamento
  - Formas de pagamento agora são aplicadas sobre o SALDO restante, não sobre o total
  - Validação impede adicionar pagamento maior que o saldo pendente
- **Bug Fix CRÍTICO**: Itens de 2 SABORES geravam cobrança duplicada
  - **Problema**: Ao criar produção para itens "2 SABORES", o sistema criava itens separados no pedido (ex: Ovo 03 PRESTÍGIO 0.5x R$ 38 + Ovo 03 CEREJA 0.5x R$ 38) além do item original
  - **Causa**: Lógica de sincronização automática de produção adicionava itens incorretamente ao pedido
  - **Solução**: Removida a adição automática de itens de produção ao pedido. Itens de produção são apenas para controle interno
  - Os itens de produção podem ser diferentes dos itens do pedido (ex: um "2 SABORES" pode gerar 2 itens de produção separados para facilitar a fabricação)
- **Bug Fix**: Quantidades decimais não permitidas na Produção
  - **Problema**: Campo de quantidade na produção tinha `min="1"` e `step="1"`, impedindo valores como 0.5
  - **Solução**: Alterado para `min="0.1"` e `step="0.1"` em `ProducaoPage.js`
- **Novos Endpoints**:
  - `DELETE /api/pedidos/{id}/item/{index}` - Remove item específico do pedido
  - `PATCH /api/pedidos/{id}/item/{index}/sabores` - Atualiza sabores de um item

### 2025-03-31 / 2025-04-01 (Sessão 10)
- **Nova Feature**: Opção "Já Separado" em itens do pedido
  - Novo botão "Separar" (azul) ao lado de "Entregar" (verde)
  - Item separado: retirado do estoque, pronto para entrega, mas ainda não entregue ao cliente
  - Badge azul "Separado" indica status do item
  - Itens separados não aparecem na lista de produção
  - Pedidos com todos itens separados aparecem em Vendas para finalização
  - Após separar, botão "Entregar" continua disponível para finalizar a entrega
- **Melhoria**: Campo de quantidade ANTES de adicionar produto
  - Novo campo "Qtd" ao lado da busca de produtos em Pedidos e Vendas
  - Permite definir quantidade (incluindo decimais como 0.5) antes de adicionar
  - Botões +/- para ajustar em 0.5
  - Quantidade é resetada para 1 após adicionar o produto
  - Resolve problema de sempre adicionar com quantidade 1
- **Nova Feature**: Export Excel "Resumo de Produção" nos Relatórios
  - Novo botão "Resumo Produção" na aba "Por Data de Entrega"
  - Exporta apenas dados agregados: Data | Produto | Sabores | Quantidade Total
  - Ideal para checklist de produção simplificado
  - Exemplo: 01/04/2026 - Ovo 06 AO LEITE 350g - quant: 24
- **Nova Feature**: Quantidades decimais para produtos vendidos por peso (bombons, trufas, etc.)
  - Input de quantidade aceita valores decimais (0.1, 0.5, 1.5, etc.)
  - Botões +/- incrementam/decrementam em 0.5
  - Subtotal é recalculado automaticamente (ex: 0.5 x R$ 200 = R$ 100)
  - Implementado em Pedidos e Vendas
- **Bug Fix CRÍTICO**: Vendas "A Prazo (Fiado)" agora mostram status "A Receber" corretamente
  - Antes: vendas com pagamento a prazo eram marcadas como "Pago"
  - Agora: frontend envia `status_pagamento: "pendente"` quando forma de pagamento é "A Prazo" ou quando checkbox "Entrega com pagamento posterior" está marcado
  - Badge laranja "A Receber" aparece corretamente na lista de vendas
- **Bug Fix**: Corrigido erro ao criar venda direta - `produto_nome` faltando no payload
- **Bug Fix**: Corrigido chamada incorreta `vendasAPI.criarDireta` → `vendasAPI.criar`
- **Nova Feature**: Pedidos com todos itens "Já Entregue" aparecem na área de Vendas
  - Pedidos onde todos os itens foram marcados como "já entregue" agora aparecem automaticamente no dropdown de "Venda de Pedido"
  - Indicação visual "[Itens Entregues]" no nome do pedido para diferenciá-los
  - Mensagem atualizada: "Pedidos concluídos, em embalagem, ou com todos itens já entregues"
- **Bug Fix**: Corrigido erro HTML "button cannot be descendant of button" no SearchableSelect
  - Mudado container principal de `<button>` para `<div>` com onClick
  - Botão de limpar (X) agora funciona sem conflitos de eventos
- **Melhoria**: Filtro "Já Entregue" na Produção totalmente funcional
  - Pedidos onde TODOS os itens foram entregues são excluídos da lista de produção
  - Contagem de itens no dropdown mostra apenas itens a produzir (exclui entregues)
  - "Iniciar Todos" considera apenas itens não entregues
  - Exemplo: PED-000077 (todos entregues) não aparece mais na Produção
  - Exemplo: PED-000072 mostra "(3 itens a produzir)" em vez de "(5 itens)" porque 2 já foram entregues
- **Verificação**: Criação de pedidos funcionando normalmente
  - Confirmado que a busca de produtos e clientes está funcionando
  - Produtos são adicionados corretamente ao pedido
  - Totais calculados corretamente

### 2025-03-30 (Sessão 9)
- **Bug Fix**: Corrigido erro "o total da forma de pagamento não pode exceder 0,00" em Venda de Pedido
  - Problema: função `calcularSubtotalItens()` usava variável `pedidos` (undefined) em vez de `pedidosConcluidos`
  - Correção aplicada para usar `pedidosConcluidos.find()`
- **Melhoria**: Habilitado desconto também para Venda de Pedido
  - Desconto disponível para ambos os tipos de venda
- **Refatoração P3 Completa**: VendasPage.js de 1812 → 831 linhas (redução de 54%)
  - Criados componentes em `/app/frontend/src/components/vendas/`:
    - `DescontoSection.js` - Seção de aplicar desconto
    - `FormasPagamentoSection.js` - Múltiplas formas de pagamento
    - `VendasTable.js` - Tabela de listagem de vendas
    - `NFCeModals.js` - Modais de pré-visualização e visualização de NFC-e
    - `index.js` - Barrel export para importação facilitada
  - Código mais limpo, testável e manutenível
- **Bug Fix**: Corrigido produto "Ovo 07 recheado AMARULA 610g" que tinha caractere tab no nome
- **Nova Feature**: Relatório de Itens a Produzir por Data de Entrega
  - Backend: `GET /api/producao/relatorio/por-data-entrega`
  - Frontend: Nova aba "Por Data de Entrega" em Relatórios (primeira aba)
  - Cards de resumo: Datas de Entrega | Itens Pendentes | Total Unidades
  - Agrupa por data de entrega com pedidos e itens detalhados
  - Destaque amarelo para "Sem data definida" e vermelho para "Atrasado"
  - Exportação para PDF e Excel
  - Inclui pedidos pendentes E itens já em produção

### 2025-12-30 (Sessão 8)
- Correção de múltiplas formas de pagamento
- Implementado desconto na venda (valor ou percentual)
  - Subtotal, desconto e total calculados automaticamente
  - Interface na etapa 2 para configurar desconto

### 2025-12-30 (Sessão 7)
- Múltiplas formas de pagamento implementadas
  - Uma venda pode ter várias formas: Dinheiro + Débito + Crédito 2x, etc.
  - Interface na etapa 2 com lista de pagamentos, botão adicionar/remover
  - Validação automática (total pago = total da venda)
  - Parcelas configuráveis para cartão de crédito

### 2025-12-30 (Sessão 6)
- Implementado cancelar/excluir pedidos
  - Botão Cancelar (X laranja): cancela produção, devolve estoque, marca pedido como cancelado
  - Botão Excluir (lixeira): remove pedidos pendentes permanentemente
  - Novo status "Cancelado" com badge vermelho
  - Lógica de reversão completa (produção, embalagem, venda)

### 2025-12-30 (Sessão 5)
- Produção com sabores separados implementada
  - Itens "2 SABORES" são desmembrados em produções individuais por sabor
  - Novo endpoint `/api/producao/relatorio/pendente` para relatório
  - Card de resumo amarelo na página de Produção mostrando quantidades pendentes por produto/sabor
  - Permite gerar relatórios como "Faltam 10.5 ovos sabor Prestígio"

### 2025-12-30 (Sessão 4)
- Modal de Sabores atualizado para usar produtos correspondentes
  - Ao selecionar "Ovo 03 recheado 2 SABORES 325g", busca automaticamente produtos como "Ovo 03 recheado BRIGADEIRO 325g"
  - Exibe nome completo do produto + sabor extraído
  - Facilita identificação na produção e embalagem

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
