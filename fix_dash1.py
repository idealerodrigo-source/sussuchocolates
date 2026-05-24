f = open('frontend/src/pages/DashboardPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old1 = "import { dashboardAPI } from '../services/api';"
new1 = "import { dashboardAPI, vendasAPI } from '../services/api';"
content = content.replace(old1, new1, 1)

old2 = "  const [stats, setStats] = useState(null);\n  const [loading, setLoading] = useState(true);"
new2 = "  const [stats, setStats] = useState(null);\n  const [loading, setLoading] = useState(true);\n  const [totalPendente, setTotalPendente] = useState(0);\n  const [numDevedores, setNumDevedores] = useState(0);"
content = content.replace(old2, new2, 1)

old3 = "      setStats(response.data);"
new3 = "      setStats(response.data);\n      try {\n        const devRes = await vendasAPI.resumoDevedores();\n        const total = devRes.data.reduce((acc, d) => acc + d.total_pendente, 0);\n        setTotalPendente(total);\n        setNumDevedores(devRes.data.length);\n      } catch (e) {}"
content = content.replace(old3, new3, 1)

open('frontend/src/pages/DashboardPage.js', 'w', encoding='utf-8').write(content)
print("Done" if 'totalPendente' in content else "NOT FOUND")