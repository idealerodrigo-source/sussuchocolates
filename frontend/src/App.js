import React from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import { PrivateRoute } from './components/PrivateRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientesPage from './pages/ClientesPage';
import ProdutosPage from './pages/ProdutosPage';
import PedidosPage from './pages/PedidosPage';
import ProducaoPage from './pages/ProducaoPage';
import EmbalagemPage from './pages/EmbalagemPage';
import EstoquePage from './pages/EstoquePage';
import VendasPage from './pages/VendasPage';
import LucratividadePage from './pages/LucratividadePage';
import RelatoriosPage from './pages/RelatoriosPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="produtos" element={<ProdutosPage />} />
            <Route path="pedidos" element={<PedidosPage />} />
            <Route path="producao" element={<ProducaoPage />} />
            <Route path="embalagem" element={<EmbalagemPage />} />
            <Route path="estoque" element={<EstoquePage />} />
            <Route path="vendas" element={<VendasPage />} />
            <Route path="lucratividade" element={<LucratividadePage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
