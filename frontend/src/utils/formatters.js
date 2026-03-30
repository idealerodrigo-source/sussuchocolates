export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('pt-BR');
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('pt-BR');
};

export const formatCPF = (cpf) => {
  if (!cpf) return '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatCNPJ = (cnpj) => {
  if (!cnpj) return '';
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export const formatPhone = (phone) => {
  if (!phone) return '';
  if (phone.length === 11) {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
};

export const formatCEP = (cep) => {
  if (!cep) return '';
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
};

export const getStatusColor = (status) => {
  const colors = {
    pendente: 'bg-[#FEFCBF] text-[#D97706]',
    em_producao: 'bg-blue-100 text-blue-700',
    em_embalagem: 'bg-purple-100 text-purple-700',
    concluido: 'bg-[#C6F6D5] text-[#2F855A]',
    entregue: 'bg-[#C6F6D5] text-[#2F855A]',
    autorizada: 'bg-[#C6F6D5] text-[#2F855A]',
    cancelado: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export const getStatusLabel = (status) => {
  const labels = {
    pendente: 'Pendente',
    em_producao: 'Em Produção',
    em_embalagem: 'Em Embalagem',
    concluido: 'Concluído',
    entregue: 'Entregue',
    entrada: 'Entrada',
    saida: 'Saída',
    ajuste: 'Ajuste',
    autorizada: 'Autorizada',
    cancelado: 'Cancelado',
  };
  return labels[status] || status;
};