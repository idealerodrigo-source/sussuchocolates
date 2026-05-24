f = open('frontend/src/pages/DashboardPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

# 1. Adicionar import vendasAPI
old1 = "import { dashboardAPI } from '../services/api';"
new1 = "import { dashboardAPI, vendasAPI } from '../services/api';"
content = content.replace(old1, new1, 1)

# 2. Adicionar estado devedores
old2 = "  const [stats, setStats] = useState(null);\n  const [loading, setLoading] = useState(true);"
new2 = "  const [stats, setStats] = useState(null);\n  const [loading, setLoading] = useState(true);\n  const [totalPendente, setTotalPendente] = useState(0);\n  const [numDevedores, setNumDevedores] = useState(0);"
content = content.replace(old2, new2, 1)

# 3. Carregar devedores no fetchStats
old3 = "  const fetchStats = async () => {\n    try {\n      const response = await dashboardAPI.stats();\n      setStats(response.data);"
new3 = "  const fetchStats = async () => {\n    try {\n      const response = await dashboardAPI.stats();\n      setStats(response.data);\n      try {\n        const devRes = await vendasAPI.resumoDevedores();\n        const total = devRes.data.reduce((acc, d) => acc + d.total_pendente, 0);\n        setTotalPendente(total);\n        setNumDevedores(devRes.data.length);\n      } catch (e) {}"
content = content.replace(old3, new3, 1)

# 4. Adicionar card A Receber apos os 4 cards existentes
old4 = "      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">"
new4 = """      {totalPendente > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-sans uppercase tracking-wider font-semibold text-orange-600 mb-1">Total A Receber</p>
            <p className="text-3xl font-serif font-bold text-orange-700">{formatCurrency(totalPendente)}</p>
            <p className="text-sm text-orange-600 mt-1">{numDevedores} cliente(s) com saldo pendente</p>
          </div>
          <div className="p-4 rounded-xl bg-orange-100 text-orange-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm40-68a28,28,0,0,1-28,28h-4v8a8,8,0,0,1-16,0v-8H104a8,8,0,0,1,0-16h36a12,12,0,0,0,0-24H116a28,28,0,0,1,0-56h4V72a8,8,0,0,1,16,0v8h16a8,8,0,0,1,0,16H116a12,12,0,0,0,0,24h24A28,28,0,0,1,168,148Z"/></svg>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">"""
content = content.replace(old4, new4, 1)

open('frontend/src/
