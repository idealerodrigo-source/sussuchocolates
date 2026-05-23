f = open('frontend/src/pages/RelatoriosPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

# 1. Adicionar estado devedores no relatorio
old1 = "  const [loading, setLoading] = useState(false);"
new1 = "  const [loading, setLoading] = useState(false);\n  const [devedores, setDevedores] = useState([]);"
content = content.replace(old1, new1, 1)

# 2. Carregar devedores junto com vendas
old2 = "    } else if (activeTab === 'vendas') {"
new2 = "    } else if (activeTab === 'vendas') {\n      buscarDevedores();"
content = content.replace(old2, new2, 1)

# 3. Adicionar import da API
old3 = "import { relatoriosAPI, producaoAPI, estoqueAPI } from '../services/api';"
new3 = "import { relatoriosAPI, producaoAPI, estoqueAPI, vendasAPI } from '../services/api';"
content = content.replace(old3, new3, 1)

open('frontend/src/pages/RelatoriosPage.js', 'w', encoding='utf-8').write(content)
print("Done" if 'devedores' in content else "NOT FOUND")