import React, { useEffect, useState } from 'react';
import { usuariosAPI, empresaAPI } from '../services/api';
import { formatDateTime } from '../utils/formatters';
import { 
  Users, Buildings, Image, Plus, Trash, PencilSimple, 
  Eye, EyeSlash, ShieldCheck, Upload, X 
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { useEmpresa } from '../contexts/EmpresaContext';

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const { atualizarLogo, DEFAULT_LOGO } = useEmpresa();
  const [activeTab, setActiveTab] = useState('usuarios');
  
  // Estados para Usuários
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [usuarioDialogOpen, setUsuarioDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [usuarioForm, setUsuarioForm] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'vendedor',
    ativo: true,
  });

  // Estados para Empresa
  const [empresa, setEmpresa] = useState(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);
  const [editingEmpresa, setEditingEmpresa] = useState(false);
  const [empresaForm, setEmpresaForm] = useState({});
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (activeTab === 'usuarios') {
      fetchUsuarios();
    } else if (activeTab === 'empresa' || activeTab === 'logo') {
      fetchEmpresa();
    }
  }, [activeTab]);

  const fetchUsuarios = async () => {
    try {
      setLoadingUsuarios(true);
      const response = await usuariosAPI.listar();
      setUsuarios(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Você não tem permissão para acessar esta área');
      } else {
        toast.error('Erro ao carregar usuários');
      }
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const fetchEmpresa = async () => {
    try {
      setLoadingEmpresa(true);
      const response = await empresaAPI.obter();
      setEmpresa(response.data);
      setEmpresaForm(response.data);
    } catch (error) {
      toast.error('Erro ao carregar dados da empresa');
    } finally {
      setLoadingEmpresa(false);
    }
  };

  // ========== USUÁRIOS ==========
  const handleSaveUsuario = async (e) => {
    e.preventDefault();
    try {
      if (editingUsuario) {
        const updateData = { ...usuarioForm };
        if (!updateData.senha) delete updateData.senha;
        await usuariosAPI.atualizar(editingUsuario.id, updateData);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await usuariosAPI.criar(usuarioForm);
        toast.success('Usuário criado com sucesso!');
      }
      setUsuarioDialogOpen(false);
      resetUsuarioForm();
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar usuário');
    }
  };

  const handleEditUsuario = (usuario) => {
    setEditingUsuario(usuario);
    setUsuarioForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      role: usuario.role,
      ativo: usuario.ativo !== false,
    });
    setUsuarioDialogOpen(true);
  };

  const handleDeleteUsuario = async (usuario) => {
    if (!window.confirm(`Deseja realmente excluir o usuário "${usuario.nome}"?`)) return;
    
    try {
      await usuariosAPI.deletar(usuario.id);
      toast.success('Usuário excluído com sucesso!');
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir usuário');
    }
  };

  const resetUsuarioForm = () => {
    setEditingUsuario(null);
    setUsuarioForm({
      nome: '',
      email: '',
      senha: '',
      role: 'vendedor',
      ativo: true,
    });
    setShowPassword(false);
  };

  // ========== EMPRESA ==========
  const handleSaveEmpresa = async (e) => {
    e.preventDefault();
    try {
      await empresaAPI.atualizar(empresaForm);
      toast.success('Dados da empresa atualizados com sucesso!');
      setEditingEmpresa(false);
      fetchEmpresa();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar dados da empresa');
    }
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const response = await empresaAPI.uploadLogo(file);
      toast.success('Logo atualizado com sucesso!');
      setEmpresa({ ...empresa, logo: response.data.logo });
      // Atualiza o logo globalmente no contexto
      atualizarLogo(response.data.logo);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao fazer upload do logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('Deseja remover o logo da empresa?')) return;
    
    try {
      await empresaAPI.removerLogo();
      toast.success('Logo removido com sucesso!');
      setEmpresa({ ...empresa, logo: null });
      // Atualiza o logo globalmente no contexto (volta ao padrão)
      atualizarLogo(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao remover logo');
    }
  };

  const getRoleLabel = (role) => {
    const roles = {
      admin: 'Administrador',
      vendedor: 'Vendedor',
      producao: 'Produção',
    };
    return roles[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-700',
      vendedor: 'bg-blue-100 text-blue-700',
      producao: 'bg-green-100 text-green-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <ShieldCheck size={64} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-serif font-bold text-red-700 mb-2">Acesso Restrito</h2>
          <p className="text-red-600">Esta área é restrita para administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold text-[#6B4423]">Configurações</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#8B5A3C]/20">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-6 py-3 font-sans font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'usuarios'
              ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
              : 'text-[#705A4D] hover:text-[#6B4423]'
          }`}
        >
          <Users size={20} weight="bold" />
          Usuários
        </button>
        <button
          onClick={() => setActiveTab('empresa')}
          className={`px-6 py-3 font-sans font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'empresa'
              ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
              : 'text-[#705A4D] hover:text-[#6B4423]'
          }`}
        >
          <Buildings size={20} weight="bold" />
          Dados da Empresa
        </button>
        <button
          onClick={() => setActiveTab('logo')}
          className={`px-6 py-3 font-sans font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'logo'
              ? 'text-[#6B4423] border-b-2 border-[#6B4423]'
              : 'text-[#705A4D] hover:text-[#6B4423]'
          }`}
        >
          <Image size={20} weight="bold" />
          Logo
        </button>
      </div>

      {/* Tab: Usuários */}
      {activeTab === 'usuarios' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-[#705A4D]">Gerencie os usuários do sistema e suas permissões.</p>
            <Dialog open={usuarioDialogOpen} onOpenChange={(open) => {
              setUsuarioDialogOpen(open);
              if (!open) resetUsuarioForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                  <Plus size={18} weight="bold" className="mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#FFFDF8]">
                <DialogHeader>
                  <DialogTitle className="text-[#6B4423] font-serif">
                    {editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveUsuario} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#6B4423] mb-1">Nome *</label>
                    <input
                      type="text"
                      required
                      value={usuarioForm.nome}
                      onChange={(e) => setUsuarioForm({ ...usuarioForm, nome: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6B4423] mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={usuarioForm.email}
                      onChange={(e) => setUsuarioForm({ ...usuarioForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6B4423] mb-1">
                      Senha {editingUsuario ? '(deixe em branco para manter)' : '*'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!editingUsuario}
                        value={usuarioForm.senha}
                        onChange={(e) => setUsuarioForm({ ...usuarioForm, senha: e.target.value })}
                        className="w-full px-4 py-2.5 pr-12 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#705A4D] hover:text-[#6B4423]"
                      >
                        {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6B4423] mb-1">Permissão *</label>
                    <select
                      required
                      value={usuarioForm.role}
                      onChange={(e) => setUsuarioForm({ ...usuarioForm, role: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                    >
                      <option value="admin">Administrador (acesso total)</option>
                      <option value="vendedor">Vendedor (vendas e clientes)</option>
                      <option value="producao">Produção (produção e embalagem)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={usuarioForm.ativo}
                      onChange={(e) => setUsuarioForm({ ...usuarioForm, ativo: e.target.checked })}
                      className="rounded border-[#8B5A3C]/30"
                    />
                    <label htmlFor="ativo" className="text-sm text-[#6B4423]">Usuário ativo</label>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setUsuarioDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1 bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                      {editingUsuario ? 'Salvar' : 'Criar Usuário'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loadingUsuarios ? (
            <div className="text-center py-12 text-[#705A4D]">Carregando...</div>
          ) : (
            <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#E8D5C4]">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Nome</th>
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Email</th>
                    <th className="text-left px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Permissão</th>
                    <th className="text-center px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Status</th>
                    <th className="text-right px-6 py-4 text-sm font-sans font-semibold text-[#3E2723]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                      <td className="px-6 py-4 text-sm text-[#4A3B32] font-medium">{usuario.nome}</td>
                      <td className="px-6 py-4 text-sm text-[#4A3B32]">{usuario.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(usuario.role)}`}>
                          {getRoleLabel(usuario.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          usuario.ativo !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {usuario.ativo !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            onClick={() => handleEditUsuario(usuario)}
                            size="sm"
                            variant="outline"
                            className="text-[#6B4423] border-[#6B4423] hover:bg-[#F5E6D3]"
                          >
                            <PencilSimple size={16} weight="bold" />
                          </Button>
                          {usuario.id !== user?.id && (
                            <Button
                              onClick={() => handleDeleteUsuario(usuario)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                            >
                              <Trash size={16} weight="bold" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Empresa */}
      {activeTab === 'empresa' && (
        <div>
          {loadingEmpresa ? (
            <div className="text-center py-12 text-[#705A4D]">Carregando...</div>
          ) : (
            <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-serif font-medium text-[#6B4423]">Dados Cadastrais</h3>
                <Button
                  onClick={() => setEditingEmpresa(!editingEmpresa)}
                  variant="outline"
                  className="text-[#6B4423] border-[#6B4423] hover:bg-[#F5E6D3]"
                >
                  <PencilSimple size={18} weight="bold" className="mr-2" />
                  {editingEmpresa ? 'Cancelar' : 'Editar'}
                </Button>
              </div>

              {editingEmpresa ? (
                <form onSubmit={handleSaveEmpresa} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Nome Fantasia</label>
                      <input
                        type="text"
                        value={empresaForm.nome || ''}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, nome: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Razão Social</label>
                      <input
                        type="text"
                        value={empresaForm.razao_social || ''}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, razao_social: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">CNPJ</label>
                      <input
                        type="text"
                        value={empresaForm.cnpj || ''}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, cnpj: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Inscrição Estadual</label>
                      <input
                        type="text"
                        value={empresaForm.ie || ''}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, ie: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                    </div>
                  </div>

                  <hr className="border-[#8B5A3C]/20 my-4" />
                  <h4 className="font-medium text-[#6B4423] mb-3">Endereço</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Endereço</label>
                      <input
                        type="text"
                        value={empresaForm.endereco || ''}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, endereco: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Número</label>
                      <input
                        type="text"
                        value={empresaForm.numero || ''}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, numero: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Complemento</label>
                      <input
                        type="text"
                        value={empresaForm.complemento || ''}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, complemento: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Bairro</label>
                      <input
                        type="text"
                        value={empresaForm.bairro || ''}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, bairro: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">CEP</label>
                      <input
                        type="text"
                        value={empresaForm.cep || ''}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, cep: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Cidade</label>
                      <input
                        type="text"
                        value={empresaForm.cidade || ''}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, cidade: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Estado</label>
                      <input
                        type="text"
                        value={empresaForm.estado || ''}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, estado: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                    </div>
                  </div>

                  <hr className="border-[#8B5A3C]/20 my-4" />
                  <h4 className="font-medium text-[#6B4423] mb-3">Contato</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Telefone</label>
                      <input
                        type="text"
                        value={empresaForm.telefone || ''}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, telefone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Email</label>
                      <input
                        type="email"
                        value={empresaForm.email || ''}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B4423] mb-1">Website</label>
                      <input
                        type="text"
                        value={empresaForm.website || ''}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, website: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]">
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-[#705A4D]">Nome Fantasia</p>
                      <p className="text-[#3E2723] font-medium">{empresa?.nome || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#705A4D]">Razão Social</p>
                      <p className="text-[#3E2723] font-medium">{empresa?.razao_social || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#705A4D]">CNPJ</p>
                      <p className="text-[#3E2723] font-medium">{empresa?.cnpj || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#705A4D]">Inscrição Estadual</p>
                      <p className="text-[#3E2723] font-medium">{empresa?.ie || '-'}</p>
                    </div>
                  </div>

                  <hr className="border-[#8B5A3C]/20" />

                  <div>
                    <p className="text-sm text-[#705A4D]">Endereço</p>
                    <p className="text-[#3E2723] font-medium">
                      {[empresa?.endereco, empresa?.numero, empresa?.complemento, empresa?.bairro]
                        .filter(Boolean).join(', ') || '-'}
                    </p>
                    <p className="text-[#3E2723]">
                      {[empresa?.cidade, empresa?.estado, empresa?.cep].filter(Boolean).join(' - ') || '-'}
                    </p>
                  </div>

                  <hr className="border-[#8B5A3C]/20" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-[#705A4D]">Telefone</p>
                      <p className="text-[#3E2723] font-medium">{empresa?.telefone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#705A4D]">Email</p>
                      <p className="text-[#3E2723] font-medium">{empresa?.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#705A4D]">Website</p>
                      <p className="text-[#3E2723] font-medium">{empresa?.website || '-'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Logo */}
      {activeTab === 'logo' && (
        <div>
          <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-serif font-medium text-[#6B4423] mb-6">Logo da Empresa</h3>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Preview do Logo */}
              <div className="flex-shrink-0">
                <p className="text-sm text-[#705A4D] mb-2">Logo Atual</p>
                <div className="w-48 h-48 bg-[#F5E6D3] rounded-xl border-2 border-dashed border-[#8B5A3C]/30 flex items-center justify-center overflow-hidden">
                  {empresa?.logo ? (
                    <img src={empresa.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-center text-[#705A4D]">
                      <Image size={48} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sem logo</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex-1">
                <p className="text-sm text-[#705A4D] mb-4">
                  O logo será exibido nos cupons fiscais, relatórios e documentos do sistema.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleUploadLogo}
                        className="hidden"
                        disabled={uploadingLogo}
                      />
                      <Button
                        type="button"
                        className="bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]"
                        disabled={uploadingLogo}
                        onClick={(e) => e.currentTarget.previousElementSibling.click()}
                      >
                        <Upload size={18} weight="bold" className="mr-2" />
                        {uploadingLogo ? 'Enviando...' : 'Enviar Novo Logo'}
                      </Button>
                    </label>
                    <p className="text-xs text-[#705A4D] mt-2">
                      Formatos: JPEG, PNG, GIF, WebP. Tamanho máximo: 2MB.
                    </p>
                  </div>

                  {empresa?.logo && (
                    <Button
                      onClick={handleRemoveLogo}
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <X size={18} weight="bold" className="mr-2" />
                      Remover Logo
                    </Button>
                  )}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Dica:</strong> Use uma imagem quadrada ou com fundo transparente para melhor resultado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
