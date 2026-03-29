import React, { createContext, useContext, useState, useEffect } from 'react';
import { empresaAPI } from '../services/api';

const DEFAULT_LOGO = "https://customer-assets.emergentagent.com/job_sussu-manage/artifacts/kgl5rby1_Logo_Sussu_Chocolates-01.png";

const EmpresaContext = createContext(null);

export function EmpresaProvider({ children }) {
  const [empresa, setEmpresa] = useState(null);
  const [logo, setLogo] = useState(DEFAULT_LOGO);
  const [loading, setLoading] = useState(true);

  const fetchEmpresa = async () => {
    try {
      const response = await empresaAPI.obter();
      setEmpresa(response.data);
      if (response.data?.logo) {
        setLogo(response.data.logo);
      } else {
        setLogo(DEFAULT_LOGO);
      }
    } catch (error) {
      console.log('Erro ao carregar dados da empresa:', error);
      setLogo(DEFAULT_LOGO);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchEmpresa();
    } else {
      setLoading(false);
    }
  }, []);

  const atualizarLogo = (novoLogo) => {
    setLogo(novoLogo || DEFAULT_LOGO);
    setEmpresa((prev) => ({ ...prev, logo: novoLogo }));
  };

  const atualizarEmpresa = (dados) => {
    setEmpresa((prev) => ({ ...prev, ...dados }));
  };

  return (
    <EmpresaContext.Provider
      value={{
        empresa,
        logo,
        loading,
        fetchEmpresa,
        atualizarLogo,
        atualizarEmpresa,
        DEFAULT_LOGO,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const context = useContext(EmpresaContext);
  if (!context) {
    throw new Error('useEmpresa deve ser usado dentro de um EmpresaProvider');
  }
  return context;
}
