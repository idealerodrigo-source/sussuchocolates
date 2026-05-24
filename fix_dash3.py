f = open('frontend/src/pages/DashboardPage.js', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

card = [
    '      {totalPendente > 0 && (\n',
    '        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm mb-6 flex items-center justify-between">\n',
    '          <div>\n',
    '            <p className="text-xs font-sans uppercase tracking-wider font-semibold text-orange-600 mb-1">Total A Receber</p>\n',
    '            <p className="text-3xl font-serif font-bold text-orange-700">{formatCurrency(totalPendente)}</p>\n',
    '            <p className="text-sm text-orange-600 mt-1">{numDevedores} cliente(s) com saldo pendente</p>\n',
    '          </div>\n',
    '          <div className="p-4 rounded-xl bg-orange-100 text-orange-600 text-4xl">💰</div>\n',
    '        </div>\n',
    '      )}\n',
    '\n',
]

new_lines = lines[:109] + card + lines[109:]
open('frontend/src/pages/DashboardPage.js', 'w', encoding='utf-8').write(''.join(new_lines))
print("Done")