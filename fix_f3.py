f = open('frontend/src/pages/VendasPage.js', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

# Encontrar linha do filteredVendas
for i, line in enumerate(lines):
    if 'const filteredVendas = useMemo' in line:
        print(f"Found at line {i+1}")
        print(repr(lines[i+1]))
        print(repr(lines[i+2]))
        print(repr(lines[i+3]))
        break