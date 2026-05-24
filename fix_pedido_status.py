f = open('frontend/src/pages/PedidosPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

# Adicionar funcao handleVoltarConcluido apos handleCancelarPedido
old1 = "  const handleCancelarPedido = async (pedido) => {"
new1 = """  const handleVoltarConcluido = async (pedido) => {
    if (!window.confirm(`Deseja reverter o pedido ${pedido.numero} para "Concluido"?`)) return;
    try {
      await pedidosAPI.atualizarStatus(pedido.id, 'concluido');
      toast.success('Pedido revertido para Concluido!');
      fetchPedidos();
    } catch (error) {
      toast.error('Erro ao atualizar status do pedido');
    }
  };

  const handleCancelarPedido = async (pedido) => {"""
content = content.replace(old1, new1, 1)

# Adicionar botao apos o botao de cancelar
old2 = "                        {pedido.status === 'pendente' && ("
new2 = """                        {pedido.status === 'entregue' && (
                          <Button
                            onClick={() => handleVoltarConcluido(pedido)}
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            title="Reverter para Concluido"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"/><path d="M228.92,49.69a8,8,0,0,0-6.86-1.43l-64,16A8,8,0,0,0,152,72V120H112V96a8,8,0,0,0-13.66-5.66l-80,80a8,8,0,0,0,0,11.32l80,80A8,8,0,0,0,112,256V232h96a8,8,0,0,0,8-8V56A8,8,0,0,0,228.92,49.69Z"/></svg>
                          </Button>
                        )}
                        {pedido.status === 'pendente' && ("""
content = content.replace(old2, new2, 1)

open('frontend/src/pages/PedidosPage.js', 'w', encoding='utf-8').write(content)
print("Done" if 'handleVoltarConcluido' in content else "NOT FOUND")