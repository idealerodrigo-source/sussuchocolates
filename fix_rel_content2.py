f = open('frontend/src/pages/RelatoriosPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old = (
    "                    <td className=\"px-4 py-3 text-sm font-medium text-[#3E2723]\">{d.cliente_nome}</td>\n"
    "                    <td className=\"px-4 py-3 text-sm text-[#705A4D]\">{d.pedido_numero}</td>\n"
    "                    <td className=\"px-4 py-3 text-sm text-center\"><span className=\"px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold\">{d.produtos_em_comum}</span></td>\n"
)

new = (
    "                    <td className=\"px-4 py-3 text-sm font-medium text-[#3E2723]\">{d.cliente_nome}</td>\n"
    "                    <td className=\"px-4 py-3 text-sm text-[#705A4D]\">{d.pedido_numero}<br/><span className=\"text-xs text-gray-400\">{d.pedido_data}</span></td>\n"
    "                    <td className=\"px-4 py-3 text-sm text-[#705A4D]\">{d.venda_id?.slice(0,8)}...<br/><span className=\"text-xs text-gray-400\">{d.venda_data}</span></td>\n"
    "                    <td className=\"px-4 py-3 text-sm\"><div className=\"flex flex-col gap-1\">{d.produtos_nomes?.map((p,j) => <span key={j} className=\"px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs\">{p}</span>)}</div></td>\n"
)

result = content.replace(old, new, 1)

# Atualizar cabecalho da tabela
old2 = (
    "                  <th className=\"text-left px-4 py-2 text-sm font-semibold tex