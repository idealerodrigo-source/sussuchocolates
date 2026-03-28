# Backend - Estrutura Modular

## Arquivos de Configuração
- `database.py` - Conexão MongoDB (~50 linhas)
- `auth.py` - Autenticação JWT (~50 linhas)
- `models.py` - Todos os modelos Pydantic (~400 linhas)
- `server.py` - Aplicação FastAPI principal (~50 linhas)
- `nfce_service.py` - Serviço de emissão NFC-e SEFAZ

## Rotas Modulares (routes/)
| Arquivo | Funcionalidade | Linhas |
|---------|----------------|--------|
| `auth.py` | Login, registro, /me | ~50 |
| `clientes.py` | CRUD clientes | ~80 |
| `produtos.py` | CRUD produtos | ~80 |
| `pedidos.py` | CRUD pedidos | ~120 |
| `producao.py` | Gestão de produção | ~100 |
| `embalagem.py` | Gestão de embalagem | ~120 |
| `estoque.py` | Movimentação de estoque | ~70 |
| `vendas.py` | Vendas e cancelamentos | ~170 |
| `nfce.py` | Emissão NFC-e | ~140 |
| `relatorios.py` | Relatórios de vendas, produção | ~280 |
| `fornecedores.py` | CRUD fornecedores | ~70 |
| `insumos.py` | CRUD insumos | ~80 |
| `compras.py` | Gestão de compras | ~100 |
| `dashboard.py` | Dashboard e análises | ~160 |
| `nf_entrada.py` | NF de Entrada (XML/chave) | ~380 |

## Resumo
- **Antes**: 1 arquivo `server.py` com ~2500 linhas
- **Depois**: 17 arquivos menores, média ~130 linhas cada
- **Total de rotas**: 64 endpoints

## Benefícios
1. Código mais fácil de manter
2. Conflitos de merge reduzidos
3. Testes mais focados por módulo
4. Melhor organização e leitura
