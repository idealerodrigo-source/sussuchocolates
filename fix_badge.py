f = open('frontend/src/components/Layout.js', 'r', encoding='utf-8')
content = f.read()
f.close()

# 1. Adicionar import vendasAPI e useState/useEffect
old1 = "import React, { useState } from 'react';"
new1 = "import React, { useState, useEffect } from 'react';\nimport { vendasAPI } from '../services/api';"
content = content.replace(old1, new1, 1)

# 2. Adicionar estado vendasVencidas
old2 = "  const [sidebarOpen, setSidebarOpen] = useState(true);"
new2 = "  const [sidebarOpen, setSidebarOpen] = useState(true);\n  const [vendasVencidas, setVendasVencidas] = useState(0);\n\n  useEffect(() => {\n    const carregar = async () => {\n      try {\n        const res = await vendasAPI.listar();\n        const hoje = new Date();\n        hoje.setHours(0,0,0,0);\n        const vencidas = res.data.filter(v =>\n          v.status_pagamento === 'pendente' &&\n          v.status_venda !== 'cancelada' &&\n          v.data_previsao_pagamento &&\n          new Date(v.data_previsao_pagamento) < hoje\n        );\n        setVendasVencidas(vencidas.length);\n      } catch (e) {}\n    };\n    carregar();\n    const interval = setInterval(carregar, 60000);\n    return () => clearInterval(interval);\n  }, []);"
content = content.replace(old2, new2, 1)

# 3. Adicionar badge no item Vendas
old3 = "                <Icon size={24} weight={active ? 'fill' : 'regular'} />\n                {sidebarOpen && <span className=\"font-medium\">{item.label}</span>}"
new3 = "                <Icon size={24} weight={active ? 'fill' : 'regular'} />\n                {sidebarOpen && <span className=\"font-medium\">{item.label}</span>}\n                {item.path === '/vendas' && vendasVencidas > 0 && (\n                  <span className=\"ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center\">{vendasVencidas}</span>\n                )}"
content = content.replace(old3, new3, 1)

open('frontend/src/components/Layout.js', 'w', encoding='utf-8').write(content)
print("Done" if 'vendasVencidas' in content else "NOT FOUND")