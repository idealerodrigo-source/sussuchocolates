import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { WhatsappLogo, InstagramLogo, ArrowRight, Star, Gift, Truck, Heart } from '@phosphor-icons/react';
import PortalLayout from '../components/PortalLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
const WHATSAPP = '5543999676206';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP}?text=Ol%C3%A1%21+Gostaria+de+fazer+um+pedido+%F0%9F%8D%AB`;

const FOTO_POR_CATEGORIA = {
  'Ovos Tradicionais': `${BASE_IMG}/ovo-ao-leite.jpg`,
  'Ovo ao Leite': `${BASE_IMG}/ovo-ao-leite.jpg`,
  'Ovo Branco': `${BASE_IMG}/ovo-branco.jpg`,
  'Ovo Mesclado': `${BASE_IMG}/ovo-mesclado.jpg`,
  'Linha Premium': `${BASE_IMG}/linha-premium.jpg`,
  'Ovos Premium': `${BASE_IMG}/linha-premium.jpg`,
  'Casca Recheada': `${BASE_IMG}/casca-recheada-amarula.jpg`,
  'Corações': `${BASE_IMG}/coracao-ao-leite.jpg`,
  'Coração': `${BASE_IMG}/coracao-ao-leite.jpg`,
  'Ovo de Colher': `${BASE_IMG}/ovo-de-colher.jpg`,
  'Ovo em Fatias': `${BASE_IMG}/ovo-em-fatias.jpg`,
};

const CATEGORIAS = [
  { img: `${BASE_IMG}/ovo-ao-leite.jpg`,      nome: 'Ovos Tradicionais', desc: 'Ao Leite, Branco, Mesclado' },
  { img: `${BASE_IMG}/linha-premium.jpg`,     nome: 'Linha Premium',     desc: 'Callebaut 54,5% e 70% cacau' },
  { img: `${BASE_IMG}/casca-recheada-amarula.jpg`, nome: 'Casca Recheada', desc: 'Prestígio, Nutella, Amarula...' },
  { img: `${BASE_IMG}/coracao-ao-leite.jpg`,  nome: 'Corações',          desc: 'Tradicionais e recheados' },
  { img: `${BASE_IMG}/ovo-de-colher.jpg`,     nome: 'Ovo de Colher',     desc: 'Com recheio cremoso' },
  { img: `${BASE_IMG}/ovo-em-fatias.jpg`,     nome: 'Ovo em Fatias',     desc: '3 recheios em 1 ovo' },
];

const DIFERENCIAIS = [
  { icon: Star, titulo: 'Há 40 anos', texto: 'Tradição familiar desde 1986, com receitas que atravessam gerações.' },
  { icon: Heart, titulo: 'Feito com amor', texto: 'Cada chocolate é produzido artesanalmente com ingredientes selecionados.' },
  { icon: Gift, titulo: 'Personalizado', texto: 'Criamos produtos especiais para datas comemorativas e eventos.' },
  { icon: Truck, titulo: 'Entregamos', texto: 'Fazemos entregas em Jacarezinho e região. Consulte disponibilidade.' },
];

export default function PortalHomePage() {
  const [produtos, setProdutos] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/produtos`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/configuracoes/empresa`).then(r => r.json()).catch(() => null),
    ]).then(([prods, emp]) => {
      setProdutos((Array.isArray(prods) ? prods : []).filter(p => p.ativo).slice(0, 8));
      setEmpresa(emp);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2C1810] via-[#3E2723] to-[#6B4423] text-white">
        {/* Padrão decorativo */}
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute text-6xl" style={{ top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, transform: `rotate(${Math.random()*360}deg)` }}>🍫</div>
          ))}
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28 flex flex-col md:flex-row items-center gap-12">
          {/* Texto */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-block bg-[#6B4423]/50 text-[#F5E6D3] text-sm px-4 py-1.5 rounded-full mb-5 border border-[#C4A57B]/30">
              🍫 Chocolates Artesanais desde 1986
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold leading-tight mb-6">
              Momentos<br />
              <span className="text-[#C4A57B]">mais doces</span><br />
              com Sussu
            </h1>
            <p className="text-[#D4B896] text-lg mb-8 leading-relaxed max-w-lg">
              Chocolates artesanais feitos com amor e tradição familiar em Jacarezinho/PR. Cada peça é única, cada sabor é uma memória.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link
                to="/catalogo"
                className="flex items-center justify-center gap-2 bg-[#C4A57B] hover:bg-[#D4B896] text-[#2C1810] px-7 py-3.5 rounded-full font-bold text-base transition-all hover:scale-105"
              >
                Ver catálogo
                <ArrowRight size={20} weight="bold" />
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-7 py-3.5 rounded-full font-bold text-base transition-all hover:scale-105"
              >
                <WhatsappLogo size={20} weight="fill" />
                Pedir pelo WhatsApp
              </a>
            </div>
          </div>

          {/* Logo/imagem */}
          <div className="flex-shrink-0">
            <div className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-[#6B4423]/30 border-4 border-[#C4A57B]/20 flex items-center justify-center shadow-2xl">
              <img
                src="https://customer-assets.emergentagent.com/job_sussu-manage/artifacts/kgl5rby1_Logo_Sussu_Chocolates-01.png"
                alt="Sussu Chocolates"
                className="w-48 md:w-64 drop-shadow-2xl"
              />
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 30C1200 60 960 0 720 0C480 0 240 60 0 30L0 60Z" fill="#FDF8F3"/>
          </svg>
        </div>
      </section>

      {/* ===== DIFERENCIAIS ===== */}
      <section className="py-16 bg-[#FDF8F3]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {DIFERENCIAIS.map((d, i) => {
              const Icon = d.icon;
              return (
                <div key={i} className="text-center p-6 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow border border-[#F0E4D4]">
                  <div className="w-12 h-12 bg-[#F5E6D3] rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon size={24} weight="fill" className="text-[#6B4423]" />
                  </div>
                  <h3 className="font-serif font-bold text-[#3E2723] text-base mb-2">{d.titulo}</h3>
                  <p className="text-sm text-[#705A4D] leading-relaxed">{d.texto}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CATEGORIAS ===== */}
      <section className="py-16 bg-[#F5EAD9]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#3E2723] mb-3">
              Nossas Delícias
            </h2>
            <p className="text-[#705A4D] text-lg">Chocolates artesanais para cada ocasião</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {CATEGORIAS.map((cat, i) => (
              <Link
                key={i}
                to="/catalogo"
                className="group flex flex-col items-center bg-white rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all border border-[#F0E4D4] overflow-hidden"
              >
                <div className="w-full h-32 overflow-hidden">
                  <img src={cat.img} alt={cat.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-3 text-center">
                  <p className="font-serif font-bold text-[#3E2723] text-sm">{cat.nome}</p>
                  <p className="text-xs text-[#8B5A3C] mt-0.5">{cat.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRODUTOS EM DESTAQUE ===== */}
      {!loading && produtos.length > 0 && (
        <section className="py-16 bg-[#FDF8F3]">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#3E2723] mb-3">
                Produtos em Destaque
              </h2>
              <p className="text-[#705A4D]">Selecione seu favorito e faça seu pedido</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {produtos.map((prod, i) => {
                const foto = FOTO_POR_CATEGORIA[prod.categoria] ||
                  FOTO_POR_CATEGORIA[prod.nome?.split(' ').slice(0,2).join(' ')] ||
                  `${BASE_IMG}/ovo-ao-leite.jpg`;
                return (
                  <div key={prod.id || i} className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden border border-[#F0E4D4] group">
                    <div className="h-44 overflow-hidden">
                      <img src={foto} alt={prod.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="p-4">
                      <p className="font-serif font-bold text-[#3E2723] text-sm leading-tight mb-1 line-clamp-2">{prod.nome}</p>
                      {prod.categoria && (
                        <span className="text-xs text-[#8B5A3C] bg-[#F5E6D3] px-2 py-0.5 rounded-full">{prod.categoria}</span>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <p className="font-bold text-[#6B4423] text-base">
                          R$ {Number(prod.preco || 0).toFixed(2).replace('.', ',')}
                        </p>
                        <a
                          href={`https://wa.me/${WHATSAPP}?text=Ol%C3%A1%21+Quero+pedir+${encodeURIComponent(prod.nome)}+%F0%9F%8D%AB`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors"
                        >
                          <WhatsappLogo size={16} weight="fill" className="text-white" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-10">
              <Link
                to="/catalogo"
                className="inline-flex items-center gap-2 bg-[#3E2723] hover:bg-[#6B4423] text-[#F5E6D3] px-8 py-3.5 rounded-full font-bold transition-colors"
              >
                Ver catálogo completo
                <ArrowRight size={20} weight="bold" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== COMO PEDIR ===== */}
      <section className="py-16 bg-gradient-to-br from-[#3E2723] to-[#6B4423] text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-3">Como fazer seu pedido?</h2>
          <p className="text-[#D4B896] mb-12 text-lg">Simples, rápido e com muito carinho!</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { num: '1', titulo: 'Escolha', texto: 'Navegue pelo catálogo e escolha seus chocolates favoritos' },
              { num: '2', titulo: 'Fale conosco', texto: 'Envie uma mensagem via WhatsApp com seu pedido e endereço' },
              { num: '3', titulo: 'Receba!', texto: 'Entregamos em Jacarezinho e região com muito carinho embalado' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-14 h-14 bg-[#C4A57B] text-[#2C1810] rounded-full flex items-center justify-center font-serif font-bold text-2xl mb-4 shadow-lg">
                  {step.num}
                </div>
                <h3 className="font-serif font-bold text-xl mb-2">{step.titulo}</h3>
                <p className="text-[#D4B896] text-sm leading-relaxed">{step.texto}</p>
              </div>
            ))}
          </div>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white px-10 py-4 rounded-full font-bold text-lg transition-all hover:scale-105 shadow-lg"
          >
            <WhatsappLogo size={26} weight="fill" />
            Fazer meu pedido agora
          </a>
        </div>
      </section>

      {/* ===== SOBRE ===== */}
      <section className="py-16 bg-[#FDF8F3]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#3E2723] mb-6">
            Nossa história
          </h2>
          <div className="w-20 h-1 bg-[#C4A57B] rounded mx-auto mb-8" />
          <p className="text-[#705A4D] text-lg leading-relaxed mb-6">
            A Sussu Chocolates nasceu da paixão por chocolates artesanais e da dedicação de uma família ao ofício de criar momentos especiais. Com <strong className="text-[#3E2723]">40 anos de história</strong> em Jacarezinho/PR, cada produto que sai de nossa cozinha carrega o cuidado, o amor e a tradição que passamos de geração em geração.
          </p>
          <p className="text-[#705A4D] text-lg leading-relaxed mb-10">
            Desde bombons e trufas até ovos de Páscoa e cestas de presente, trabalhamos com ingredientes selecionados para garantir que cada mordida seja uma experiência inesquecível.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://www.instagram.com/sussu_chocolates/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-7 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
            >
              <InstagramLogo size={20} weight="fill" />
              @sussu_chocolates
            </a>
            <Link
              to="/contato"
              className="flex items-center justify-center gap-2 border-2 border-[#6B4423] text-[#6B4423] hover:bg-[#6B4423] hover:text-white px-7 py-3 rounded-full font-semibold transition-colors"
            >
              Fale conosco
              <ArrowRight size={18} weight="bold" />
            </Link>
          </div>
        </div>
      </section>

    </PortalLayout>
  );
}
