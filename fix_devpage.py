f = open('frontend/src/pages/VendasPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old1 = '  const [loading, setLoading] = useState(true);'
new1 = '  const [loading, setLoading] = useState(true);\n  const [devedores, setDevedores] = useState({});'
content = content.replace(old1, new1, 1)

old2 = '      setVendas(vendasRes.data);'
new2 = '      setVendas(vendasRes.data);\n      try {\n        const devedoresRes = await vendasAPI.resumoDevedores();\n        const devedoresMap = {};\n        devedoresRes.data.forEach(d => { devedoresMap[d.cliente_id] = d; });\n        setDevedores(devedoresMap);\n      } catch (e) {}'
content = content.replace(old2, new2, 1)

old3 = '        onConfirmarPagamento={handleConfirmarPagamento}'
new3 = '        devedores={devedores}\n        onConfirmarPagamento={handleConfirmarPagamento}'
content = content.replace(old3, new3, 1)

open('frontend/src/pages/VendasPage.js', 'w', encoding='utf-8').write(content)
print("Done" if old1 not in content else "NOT FOUND")