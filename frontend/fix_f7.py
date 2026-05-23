f = open('frontend/src/pages/VendasPage.js', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

# Remover linhas 37-40 (indices 36-39) que são duplicatas
new_lines = lines[:36] + lines[40:]

open('frontend/src/pages/VendasPage.js', 'w', encoding='utf-8').write(''.join(new_lines))
print("Done")