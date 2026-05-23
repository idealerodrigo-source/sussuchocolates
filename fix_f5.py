f = open('frontend/src/pages/VendasPage.js', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

# Remover linha 105 (return () errado) - indice 104
new_lines = lines[:104] + lines[105:]

open('frontend/src/pages/VendasPage.js', 'w', encoding='utf-8').write(''.join(new_lines))
print("Done")