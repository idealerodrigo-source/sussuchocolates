f = open('frontend/src/components/Layout.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old = "    const carregar = async () => {\n      try {\n        const res = await vendasAPI.listar();"
new = "    const carregar = async () => {\n      try {\n        const token = localStorage.getItem('token');\n        if (!token) return;\n        const res = await vendasAPI.listar();"
content = content.replace(old, new, 1)

open('frontend/src/components/Layout.js', 'w', encoding='utf-8').write(content)
print("Done" if "if (!token)" in content else "NOT FOUND")