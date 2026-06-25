import React, { useState } from 'react';
import { WhatsappLogo, InstagramLogo, FacebookLogo, MapPin, Phone, Envelope, Clock } from '@phosphor-icons/react';
import PortalLayout from '../components/PortalLayout';

const WHATSAPP = '5543999676206';

export default function ContatoPage() {
  const [form, setForm] = useState({ nome: '', telefone: '', mensagem: '' });

  const handleWhatsApp = (e) => {
    e.preventDefault();
    if (!form.nome || !form.mensagem) return;
    const texto = `Olá! Sou ${form.nome}${form.telefone ? ` (${form.telefone})` : ''}.\n\n${form.mensagem}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <PortalLayout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#3E2723] to-[#6B4423] text-white py-16 text-center">
        <h1 className="text-4xl font-serif font-bold mb-3">Entre em contato</h1>
        <p className="text-[#D4B896] text-lg">Estamos prontos para atender você com muito carinho</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

          {/* Informações */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#3E2723] mb-6">Informações</h2>
              <div className="space-y-5">
                {[
                  {
                    icon: MapPin,
                    titulo: 'Endereço',
                    linhas: ['Rua Quintino Bocaiuva, 737', 'Centro — Jacarezinho/PR', 'CEP: 86.400-000'],
                  },
                  {
                    icon: Phone,
                    titulo: 'Telefone / WhatsApp',
                    linhas: ['(43) 99967-6206'],
                    link: `https://wa.me/${WHATSAPP}`,
                  },
                  {
                    icon: Envelope,
                    titulo: 'E-mail',
                    linhas: ['sussuchocolates@hotmail.com'],
                    link: 'mailto:sussuchocolates@hotmail.com',
                  },
                  {
                    icon: Clock,
                    titulo: 'Atendimento',
                    linhas: ['Segunda a Sexta: 8h às 18h', 'Sábado: 8h às 12h'],
                  },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 bg-[#F5E6D3] rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon size={20} weight="fill" className="text-[#6B4423]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#3E2723] text-sm mb-1">{item.titulo}</p>
                        {item.linhas.map((l, li) =>
                          item.link && li === 0 ? (
                            <a key={li} href={item.link} target="_blank" rel="noreferrer"
                              className="block text-sm text-[#705A4D] hover:text-[#6B4423] transition-colors">
                              {l}
                            </a>
                          ) : (
                            <p key={li} className="text-sm text-[#705A4D]">{l}</p>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Redes sociais */}
            <div>
              <h3 className="font-serif font-bold text-[#3E2723] mb-4">Redes Sociais</h3>
              <div className="flex gap-3">
                <a href="https://www.instagram.com/sussu_chocolates/" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                  <InstagramLogo size={18} weight="fill" />
                  Instagram
                </a>
                <a href="https://www.facebook.com/sussuchocolate/" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  <FacebookLogo size={18} weight="fill" />
                  Facebook
                </a>
              </div>
            </div>

            {/* Mapa */}
            <div className="rounded-2xl overflow-hidden shadow-md border border-[#F0E4D4]">
              <iframe
                title="Localização Sussu Chocolates"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.0!2d-49.9724!3d-23.1618!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sRua+Quintino+Bocaiuva%2C+737+-+Centro%2C+Jacarezinho+-+PR!5e0!3m2!1spt!2sbr!4v1234567890"
                width="100%"
                height="220"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>

          {/* Formulário via WhatsApp */}
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#3E2723] mb-6">Envie uma mensagem</h2>
            <form onSubmit={handleWhatsApp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#6B4423] mb-1.5">Seu nome *</label>
                <input
                  type="text"
                  required
                  placeholder="Como posso te chamar?"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-[#D4B896] rounded-xl focus:outline-none focus:border-[#6B4423] text-[#3E2723] placeholder:text-[#B09070]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6B4423] mb-1.5">WhatsApp</label>
                <input
                  type="tel"
                  placeholder="(43) 99999-9999"
                  value={form.telefone}
                  onChange={e => setForm({ ...form, telefone: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-[#D4B896] rounded-xl focus:outline-none focus:border-[#6B4423] text-[#3E2723] placeholder:text-[#B09070]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6B4423] mb-1.5">Mensagem *</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Qual chocolate você deseja? Tem alguma data especial? Conta pra gente! 🍫"
                  value={form.mensagem}
                  onChange={e => setForm({ ...form, mensagem: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-[#D4B896] rounded-xl focus:outline-none focus:border-[#6B4423] text-[#3E2723] placeholder:text-[#B09070] resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-base transition-colors shadow-md hover:shadow-lg"
              >
                <WhatsappLogo size={22} weight="fill" />
                Enviar via WhatsApp
              </button>
              <p className="text-xs text-center text-[#9A7B5C]">
                Ao clicar, você será redirecionado para o WhatsApp com sua mensagem pré-preenchida.
              </p>
            </form>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
