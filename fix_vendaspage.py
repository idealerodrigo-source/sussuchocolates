f = open('frontend/src/pages/VendasPage.js', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

new_handler = '''
const handleEditarPagamento = async (vendaId, dados) => {
  try {
    await vendasAPI.editarPagamento(vendaId, dados);
    toast.success('Pagamento atualizado!');
    fetchData();
  } catch (error) {
    toast.error('Erro ao editar pagamento');
  }
};

'''

# Inserir após handleEditarPagamento existente (linha com handleCancelarVenda)
new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    if 'const handleCancelarVenda' in line and i > 400:
        # já tem handleEditarPagamento, não inserir
        break

# Melhor abordagem: substituir handleEditarPagamento existente
content = ''.join(lines)
old = '''const handleEditarPagamento = async (vendaId, formaPagamento) => {
    try {
      await vendasAPI.confirmarPagamento(vendaId, { forma_pagamento: formaPagamento });
      toast.success('Forma de pagamento atualizada!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar pagamento');
    }
  };'''

new = '''const handleEditarPagamento = async (vendaId, dados) => {
    try {
      await vendasAPI.editarPagamento(vendaId, dados);
      toast.success('Pagamento atualizado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao editar pagamento');
    }
  };'''

result = content.replace(old, new, 1)
open('frontend/src/pages/VendasPage.js', 'w', encoding='utf-8').write(result)
print("Done" if result != content else "NOT FOUND")