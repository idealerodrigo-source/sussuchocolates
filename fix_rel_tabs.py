f = open('frontend/src/pages/RelatoriosPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

# 1. Adicionar estados
old1 = "  const [pedidosStatusVendas, setPedidosStatusVendas] = useState(null);"
new1 = "  const [pedidosStatusVendas, setPedidosStatusVendas] = useState(null);\n  const [pedidosSemVenda, setPedidosSemVenda] = useState(null);\n  const [duplicatas, setDuplicatas] = useState(null);"
content = content.replace(old1, new1, 1)

# 2. Adicionar carregamento nas abas
old2 = "    } else if (activeTab === 'status-vendas') {"
new2 = "    } else if (activeTab === 'consistencia') {\n      buscarConsistencia();\n    } else if (activeTab === 'status-vendas') {"
content = content.replace(old2, new2, 1)

# 3. Adicionar funcao buscarConsistencia
old3 = "  const buscarRelatorioVendas = async () => {"
new3 = """  const buscarConsistencia = async () => {
    try {
      const [semVendaRes, dupRes] = await Promise.all([
        relatoriosAPI.pedidosSemVenda(),
        relatoriosAPI.duplicatas()
      ]);
      setPedidosSemVenda(semVendaRes.data);
      setDuplicatas(dupRes.data);
    } catch (e) {
      toast.error('Erro ao carregar dados de consistencia');
    }
  };

  const buscarRelatorioVendas = async () => {"""
content = content.replace(old3, new3, 1)

# 4. Adicionar tab na lista
old4 = "    { id: 'vendas', label: 'Vendas', icon: Package },"
new4 = "    { id: 'vendas', label: 'Vendas', icon: Package },\n    { id: 'consistencia', label: 'Consistencia', icon: Warning },"
content = content.replace(old4, new4, 1)

open('frontend/src/pages/RelatoriosPage.js', 'w', encoding='utf-8').write(content)
print("Done" if 'consistencia' in content else "NOT FOUND")