import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { List, X, WhatsappLogo, InstagramLogo, FacebookLogo, ShoppingCart, Warning, ArrowRight } from '@phosphor-icons/react';

const WHATSAPP = '5543999676206';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP}?text=Ol%C3%A1%21+Gostaria+de+fazer+um+pedido+%F0%9F%8D%AB`;

function PopupConstrucao({ onFechar }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-[fadeIn_0.3s_ease]">
        {/* Header marrom */}
        <div className="bg-gradient-to-br from-[#3E2723] to-[#6B4423] p-8 text-center">
          <div className="text-6xl mb-3">🍫</div>
          <img
            src="https://customer-assets.emergentagent.com/job_sussu-manage/artifacts/kgl5rby1_Logo_Sussu_Chocolates-01.png"
            alt="Sussu Chocolates"
            className="h-14 mx-auto mb-4"
          />
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1.5 rounded-full">
            <Warning size={14} weight="fill" />
            SITE EM CONSTRUÇÃO
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-8 text-center">
          <h2 className="text-xl font-serif font-bold text-[#3E2723] mb-3">
            Estamos preparando algo especial para você!
          </h2>
          <p className="text-[#705A4D] text-sm leading-relaxed mb-6">
            Nosso site está em fase de construção e alguns conteúdos ainda podem estar incompletos ou sujeitos a alterações. Para pedidos, dúvidas ou informações, fale diretamente conosco pelo <strong className="text-green-700">WhatsApp</strong> ou pelo <strong className="text-pink-600">Instagram</strong>.
          </p>

          {/* Botões de contato */}
          <div className="flex flex-col gap-3 mb-6">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-bold text-sm transition-colors"
            >
              <WhatsappLogo size={18} weight="fill" />
              Falar pelo WhatsApp: (43) 99967-6206
            </a>
            <a
              href="https://www.instagram.com/sussu_chocolates/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white px-6 py-3 rounded-full font-bold text-sm transition-opacity"
            >
              <InstagramLogo size={18} weight="fill" />
              @sussu_chocolates no Instagram
            </a>
          </div>

          <button
            onClick={onFechar}
            className="flex items-center justify-center gap-2 w-full border-2 border-[#D4B896] text-[#6B4423] hover:bg-[#F5E6D3] px-6 py-2.5 rounded-full font-semibold text-sm transition-colors"
          >
            Entendi, quero explorar o site
            <ArrowRight size={16} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PortalLayout({ children, carrinhoCount = 0, onCarrinhoClick = null }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [popupAberto, setPopupAberto] = useState(false);
  const { pathname } = useLocation();

  // Mostrar popup uma vez por sessão
  useEffect(() => {
    const jaViu = sessionStorage.getItem('sussu_aviso_construcao');
    if (!jaViu) {
      setPopupAberto(true);
    }
  }, []);

  const fecharPopup = () => {
    sessionStorage.setItem('sussu_aviso_construcao', 'true');
    setPopupAberto(false);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuAberto(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const links = [
    { to: '/', label: 'Início' },
    { to: '/catalogo', label: 'Catálogo' },
    { to: '/contato', label: 'Contato' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Georgia', serif", background: '#FDF8F3' }}>

      {popupAberto && <PopupConstrucao onFechar={fecharPopup} />}

      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-md bg-[#3E2723]/97 backdrop-blur' : 'bg-[#3E2723]'}`}>
        {/* Top bar */}
        <div className="bg-[#6B4423] text-[#F5E6D3] text-xs py-1.5 text-center">
          <span>📍 Rua Quintino Bocaiuva, 737 — Jacarezinho/PR</span>
          <span className="mx-3">|</span>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="hover:text-white font-medium">
            📱 (43) 99967-6206
          </a>
        </div>

        {/* Main header */}
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="https://customer-assets.emergentagent.com/job_sussu-manage/artifacts/kgl5rby1_Logo_Sussu_Chocolates-01.png"
              alt="Sussu Chocolates"
              className="h-14 w-auto"
            />
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`text-sm font-medium transition-colors hover:text-[#F5E6D3] ${
                  pathname === l.to ? 'text-[#F5E6D3] border-b-2 border-[#C4A57B]' : 'text-[#C4A57B]'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Ações */}
          <div className="flex items-center gap-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors"
            >
              <WhatsappLogo size={18} weight="fill" />
              Pedir agora
            </a>
            {/* Carrinho */}
            {onCarrinhoClick ? (
              <button
                onClick={onCarrinhoClick}
                className="relative p-2 text-[#C4A57B] hover:text-white"
                title="Abrir carrinho"
              >
                <ShoppingCart size={24} weight="bold" />
                {carrinhoCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {carrinhoCount}
                  </span>
                )}
              </button>
            ) : (
              <Link to="/catalogo" className="relative p-2 text-[#C4A57B] hover:text-white">
                <ShoppingCart size={24} weight="bold" />
                {carrinhoCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {carrinhoCount}
                  </span>
                )}
              </Link>
            )}
            {/* Menu mobile */}
            <button
              className="md:hidden text-[#C4A57B] hover:text-white p-1"
              onClick={() => setMenuAberto(!menuAberto)}
            >
              {menuAberto ? <X size={26} weight="bold" /> : <List size={26} weight="bold" />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {menuAberto && (
          <div className="md:hidden bg-[#2C1810] border-t border-[#6B4423] px-4 pb-4">
            {links.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className="block py-3 text-[#C4A57B] hover:text-white font-medium border-b border-[#6B4423]/40 last:border-0"
              >
                {l.label}
              </Link>
            ))}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 mt-3 bg-green-600 text-white px-4 py-2.5 rounded-full text-sm font-semibold"
            >
              <WhatsappLogo size={18} weight="fill" />
              Fazer pedido pelo WhatsApp
            </a>
          </div>
        )}
      </header>

      {/* Conteúdo */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#2C1810] text-[#C4A57B]">
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Sobre */}
          <div>
            <img
              src="https://customer-assets.emergentagent.com/job_sussu-manage/artifacts/kgl5rby1_Logo_Sussu_Chocolates-01.png"
              alt="Sussu Chocolates"
              className="h-16 w-auto mb-4 opacity-90"
            />
            <p className="text-sm text-[#9A7B5C] leading-relaxed">
              Chocolates artesanais feitos com amor e tradição familiar há 40 anos. Cada peça é um momento especial.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[#F5E6D3] font-semibold mb-4 text-base">Navegação</h4>
            <div className="space-y-2">
              {links.map(l => (
                <Link key={l.to} to={l.to} className="block text-sm text-[#9A7B5C] hover:text-[#F5E6D3] transition-colors">
                  {l.label}
                </Link>
              ))}
              <Link to="/login" className="block text-sm text-[#9A7B5C] hover:text-[#F5E6D3] transition-colors">
                Área do sistema
              </Link>
            </div>
          </div>

          {/* Contato */}
          <div>
            <h4 className="text-[#F5E6D3] font-semibold mb-4 text-base">Contato</h4>
            <div className="space-y-2 text-sm text-[#9A7B5C]">
              <p>📍 Rua Quintino Bocaiuva, 737</p>
              <p>Centro — Jacarezinho/PR</p>
              <p>CEP: 86.400-000</p>
              <a href={`tel:+5543999676206`} className="block hover:text-[#F5E6D3]">📱 (43) 99967-6206</a>
              <a href="mailto:sussuchocolates@hotmail.com" className="block hover:text-[#F5E6D3] text-xs">✉️ sussuchocolates@hotmail.com</a>
            </div>
            {/* Redes sociais */}
            <div className="flex gap-3 mt-5">
              <a
                href="https://www.instagram.com/sussu_chocolates/"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#3E2723] hover:bg-pink-600 flex items-center justify-center transition-colors"
              >
                <InstagramLogo size={20} weight="fill" className="text-[#F5E6D3]" />
              </a>
              <a
                href="https://www.facebook.com/sussuchocolate/"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#3E2723] hover:bg-blue-600 flex items-center justify-center transition-colors"
              >
                <FacebookLogo size={20} weight="fill" className="text-[#F5E6D3]" />
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#3E2723] hover:bg-green-600 flex items-center justify-center transition-colors"
              >
                <WhatsappLogo size={20} weight="fill" className="text-[#F5E6D3]" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-[#3E2723] py-4 text-center text-xs text-[#5C4033]">
          © {new Date().getFullYear()} Sussu Chocolates — Todos os direitos reservados
          <span className="mx-2">|</span>
          Desenvolvido por <a href="#" className="text-[#7B5E3A] hover:text-[#C4A57B]">Karo & Figli Ltda</a>
        </div>
      </footer>

      {/* Botão flutuante WhatsApp */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        title="Falar no WhatsApp"
      >
        <WhatsappLogo size={30} weight="fill" className="text-white" />
      </a>
    </div>
  );
}
