import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
  });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = isLogin
        ? await login(formData.email, formData.senha)
        : await register(formData.nome, formData.email, formData.senha);

      if (result.success) {
        toast.success(isLogin ? 'Login realizado com sucesso!' : 'Conta criada com sucesso!');
        navigate('/dashboard');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:block lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage: `url('https://static.prod-images.emergentagent.com/jobs/925c05d5-c856-4bd2-988f-bcc3715b2cda/images/2dfaf7cd2e11d101358cd221cc89a6fba4a8dee4756e9519a8fe1f370773c601.png')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#6B4423]/80 to-[#3E2723]/90" />
        <div className="relative h-full flex flex-col justify-center px-12 text-[#F5E6D3]">
          <img
            src="https://customer-assets.emergentagent.com/job_sussu-manage/artifacts/kgl5rby1_Logo_Sussu_Chocolates-01.png"
            alt="Sussu Chocolates"
            className="w-64 mb-8"
          />
          <h1 className="text-5xl font-serif font-bold mb-4">Sistema de Gestão</h1>
          <p className="text-xl font-sans text-[#E8D5C4]">
            Controle completo da sua fábrica de chocolates artesanais
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#FFFDF8]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif font-bold text-[#3E2723] mb-2">
              {isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
            </h2>
            <p className="text-[#705A4D] font-sans">
              {isLogin ? 'Entre com suas credenciais' : 'Preencha os dados para começar'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="auth-form">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-[#6B4423] mb-1" htmlFor="nome">
                  Nome completo
                </label>
                <input
                  id="nome"
                  type="text"
                  data-testid="input-nome"
                  required={!isLogin}
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] placeholder:text-[#9A8476] font-sans"
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#6B4423] mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                data-testid="input-email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] placeholder:text-[#9A8476] font-sans"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6B4423] mb-1" htmlFor="senha">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                data-testid="input-senha"
                required
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#FFFDF8] border border-[#8B5A3C]/30 rounded-lg focus:border-[#6B4423] focus:ring-1 focus:ring-[#6B4423] outline-none text-[#3E2723] placeholder:text-[#9A8476] font-sans"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              data-testid="btn-submit"
              disabled={loading}
              className="w-full bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C] font-medium rounded-lg px-6 py-2.5 shadow-sm font-sans disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              data-testid="btn-toggle-mode"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#6B4423] hover:text-[#8B5A3C] font-medium text-sm font-sans"
            >
              {isLogin ? 'Não tem uma conta? Criar conta' : 'Já tem uma conta? Fazer login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}