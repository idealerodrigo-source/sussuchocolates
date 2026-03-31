import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const clientesAPI = {
  listar: () => api.get('/clientes'),
  obter: (id) => api.get(`/clientes/${id}`),
  criar: (data) => api.post('/clientes', data),
  atualizar: (id, data) => api.put(`/clientes/${id}`, data),
  deletar: (id) => api.delete(`/clientes/${id}`),
};

export const produtosAPI = {
  listar: () => api.get('/produtos'),
  obter: (id) => api.get(`/produtos/${id}`),
  criar: (data) => api.post('/produtos', data),
  atualizar: (id, data) => api.put(`/produtos/${id}`, data),
  deletar: (id) => api.delete(`/produtos/${id}`),
};

export const pedidosAPI = {
  listar: () => api.get('/pedidos'),
  obter: (id) => api.get(`/pedidos/${id}`),
  criar: (data) => api.post('/pedidos', data),
  atualizar: (id, data) => api.put(`/pedidos/${id}`, data),
  atualizarStatus: (id, status) => api.patch(`/pedidos/${id}/status?status=${status}`),
  cancelar: (id) => api.delete(`/pedidos/${id}/cancelar`),
  excluir: (id) => api.delete(`/pedidos/${id}`),
};

export const producaoAPI = {
  listar: () => api.get('/producao'),
  criar: (data) => api.post('/producao', data),
  concluir: (id) => api.patch(`/producao/${id}/concluir`),
  relatorioPendente: () => api.get('/producao/relatorio/pendente'),
  relatorioPorDataEntrega: () => api.get('/producao/relatorio/por-data-entrega'),
};

export const embalagemAPI = {
  listar: () => api.get('/embalagem'),
  criar: (data) => api.post('/embalagem', data),
  concluir: (id, data) => api.patch(`/embalagem/${id}/concluir`, data),
};

export const estoqueAPI = {
  listar: () => api.get('/estoque'),
  criar: (data) => api.post('/estoque', data),
  saldo: () => api.get('/estoque/saldo'),
};

export const vendasAPI = {
  listar: () => api.get('/vendas'),
  criar: (data) => api.post('/vendas', data),
  atualizar: (id, data) => api.put(`/vendas/${id}`, data),
  confirmarPagamento: (id) => api.put(`/vendas/${id}/confirmar-pagamento`),
  cancelar: (id, motivo) => api.put(`/vendas/${id}/cancelar`, { motivo }),
  restaurar: (id) => api.put(`/vendas/${id}/restaurar`),
};

export const relatoriosAPI = {
  vendas: (dataInicio, dataFim) => api.get('/relatorios/vendas', {
    params: { data_inicio: dataInicio, data_fim: dataFim }
  }),
  producao: (dataInicio, dataFim) => api.get('/relatorios/producao', {
    params: { data_inicio: dataInicio, data_fim: dataFim }
  }),
  clientes: () => api.get('/relatorios/clientes'),
  producaoPendente: () => api.get('/relatorios/producao/pendente'),
  producaoConcluida: (dataInicio, dataFim) => api.get('/relatorios/producao/concluida', {
    params: { data_inicio: dataInicio, data_fim: dataFim }
  }),
  pedidosResumo: () => api.get('/relatorios/pedidos/resumo'),
};

export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
};

export const analiseAPI = {
  lucratividade: () => api.get('/analise/lucratividade'),
  desempenho: () => api.get('/analise/produtos-desempenho'),
};

export const fornecedoresAPI = {
  listar: () => api.get('/fornecedores'),
  criar: (data) => api.post('/fornecedores', data),
  atualizar: (id, data) => api.put(`/fornecedores/${id}`, data),
  deletar: (id) => api.delete(`/fornecedores/${id}`),
};

export const insumosAPI = {
  listar: () => api.get('/insumos'),
  criar: (data) => api.post('/insumos', data),
  atualizar: (id, data) => api.put(`/insumos/${id}`, data),
  deletar: (id) => api.delete(`/insumos/${id}`),
};

export const comprasAPI = {
  listar: () => api.get('/compras'),
  criar: (data) => api.post('/compras', data),
  atualizarStatus: (id, status) => api.patch(`/compras/${id}/status?status=${status}`),
  deletar: (id) => api.delete(`/compras/${id}`),
};

export const nfEntradaAPI = {
  listar: () => api.get('/nf-entrada'),
  criar: (data) => api.post('/nf-entrada', data),
  parseHtml: (html) => api.post('/nf-entrada/parse-html', html, { headers: { 'Content-Type': 'text/plain' } }),
  parseXml: (xml) => api.post('/nf-entrada/parse-xml', xml, { headers: { 'Content-Type': 'text/plain' } }),
  parseChave: (chave) => api.post(`/nf-entrada/parse-chave?chave=${chave}`),
  deletar: (id) => api.delete(`/nf-entrada/${id}`),
};

// NFC-e (Cupom Fiscal)
export const nfceAPI = {
  configuracao: () => api.get('/nfce/configuracao'),
  statusSefaz: () => api.get('/nfce/status-sefaz'),
  emitir: (dados) => api.post('/nfce/emitir', dados),
  cancelar: (chave, justificativa) => api.post(`/nfce/cancelar/${chave}?justificativa=${encodeURIComponent(justificativa)}`),
  historico: (limit = 50, skip = 0) => api.get(`/nfce/historico?limit=${limit}&skip=${skip}`),
  obter: (id) => api.get(`/nfce/${id}`),
};

// Configurações - Usuários
export const usuariosAPI = {
  listar: () => api.get('/configuracoes/usuarios'),
  criar: (data) => api.post('/configuracoes/usuarios', data),
  atualizar: (id, data) => api.put(`/configuracoes/usuarios/${id}`, data),
  deletar: (id) => api.delete(`/configuracoes/usuarios/${id}`),
};

// Configurações - Empresa
export const empresaAPI = {
  obter: () => api.get('/configuracoes/empresa'),
  atualizar: (data) => api.put('/configuracoes/empresa', data),
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/configuracoes/empresa/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  removerLogo: () => api.delete('/configuracoes/empresa/logo'),
};

export default api;