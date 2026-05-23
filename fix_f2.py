f = open('frontend/src/pages/VendasPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old1 = "  const [searchTerm, setSearchTerm] = useState('');"
new1 = "  const [searchTerm, setSearchTerm] = useState('');\n  const [filtroStatus, setFiltroStatus] = useState('todos');\n  const [filtroTipo, setFiltroTipo] = useState('todos');\n  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');\n  const [filtroClienteId, setFiltroClienteId] = useState('');"
content = content.replace(old1, new1, 1)

old2 = '  }, [vendas, searchTerm]);'
new2 = '  }, [vendas, searchTerm, filtroStatus, filtroTipo, filtroPeriodo, filtroClienteId]);'
content = content.replace(old2, new2, 1)

open('frontend/src/pages/VendasPage.js', 'w', encoding='utf-8').write(content)
print("Done" if 'filtroStatus' in content else "NOT FOUND")