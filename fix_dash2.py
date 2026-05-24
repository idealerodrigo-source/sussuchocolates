f = open('frontend/src/pages/DashboardPage.js', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

# Encontrar linha do grid lg:grid-cols-2
for i, line in enumerate(lines):
    if 'grid-cols-1 lg:grid-cols-2 gap-6' in line:
        print(f"Found at line {i+1}: {line.rstrip()}")
        break
