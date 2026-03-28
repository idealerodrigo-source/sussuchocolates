# Backend - Estrutura Modular

## Arquivos Criados

### Configuração Base
- `database.py` - Conexão MongoDB
- `auth.py` - Autenticação JWT
- `models.py` - Todos os modelos Pydantic

### Rotas Modulares (routes/)
- `auth.py` - Login, registro, /me
- `clientes.py` - CRUD clientes
- `produtos.py` - CRUD produtos
- `pedidos.py` - CRUD pedidos
- `producao.py` - Gestão de produção
- `embalagem.py` - Gestão de embalagem
- `estoque.py` - Movimentação de estoque
- `vendas.py` - Vendas e cancelamentos
- `__init__.py` - Agregador de routers

## Como Migrar Completamente

Para completar a migração, o `server.py` deveria importar os routers assim:

```python
from fastapi import FastAPI
from routes import api_router

app = FastAPI(title="Sussu Chocolates API")
app.include_router(api_router)
```

## Funcionalidades que ainda estão no server.py
- NFC-e (emissão, cancelamento, histórico)
- Relatórios (vendas, produção, clientes, etc.)
- Fornecedores e Insumos
- Compras
- NF de Entrada
- Lucratividade

## Status
Os arquivos modulares estão criados e funcionais. A migração completa
pode ser feita gradualmente, testando cada módulo antes de remover
o código correspondente do server.py.
