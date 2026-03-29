import React, { useState, useEffect } from 'react';
import { DownloadSimple, X, DeviceMobile } from '@phosphor-icons/react';
import { Button } from './ui/button';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Verificar se já está instalado como PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true;
    
    if (isStandalone) {
      return; // Já está instalado, não mostrar banner
    }

    // Verificar se o usuário já dispensou o banner
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    const dismissedDate = dismissed ? new Date(dismissed) : null;
    const daysSinceDismissed = dismissedDate ? 
      (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24) : null;

    // Mostrar novamente após 7 dias
    if (dismissedDate && daysSinceDismissed < 7) {
      return;
    }

    // Para iOS, mostrar instruções manuais
    if (iOS) {
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Para outros navegadores, capturar o evento beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA instalado com sucesso');
    }
    
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSInstructions(false);
    localStorage.setItem('pwa-banner-dismissed', new Date().toISOString());
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Banner de instalação */}
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[#3E2723] text-[#F5E6D3] rounded-xl shadow-2xl p-4 z-50 animate-in slide-in-from-bottom-5">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={18} />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-[#6B4423] rounded-xl flex items-center justify-center">
            <DeviceMobile size={28} weight="fill" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-1">Instalar o App</h3>
            <p className="text-sm text-[#E8D5C4] mb-3">
              Instale o Sussu Chocolates no seu dispositivo para acesso rápido.
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                size="sm"
                className="bg-[#F5E6D3] text-[#3E2723] hover:bg-white flex items-center gap-1"
              >
                <DownloadSimple size={16} weight="bold" />
                Instalar
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
                className="text-[#E8D5C4] hover:text-white hover:bg-white/10"
              >
                Agora não
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de instruções para iOS */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#FFFDF8] rounded-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-[#F5E6D3] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <DeviceMobile size={36} className="text-[#6B4423]" />
              </div>
              <h3 className="text-xl font-semibold text-[#3E2723] mb-2">
                Instalar no iOS
              </h3>
              <p className="text-sm text-[#705A4D]">
                Siga os passos abaixo para instalar o app:
              </p>
            </div>
            
            <ol className="space-y-3 text-sm text-[#3E2723] mb-6">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#6B4423] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span>Toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima) na barra do Safari</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#6B4423] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#6B4423] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span>Confirme tocando em <strong>"Adicionar"</strong></span>
              </li>
            </ol>
            
            <Button
              onClick={handleDismiss}
              className="w-full bg-[#6B4423] text-[#F5E6D3] hover:bg-[#8B5A3C]"
            >
              Entendi
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// Hook para verificar se está rodando como PWA
export function useIsPWA() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true;
    setIsPWA(isStandalone);
  }, []);

  return isPWA;
}

// Hook para verificar status online/offline
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
