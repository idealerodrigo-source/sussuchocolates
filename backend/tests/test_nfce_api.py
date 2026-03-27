"""
Test suite for NFC-e (Nota Fiscal de Consumidor Eletrônica) APIs
Tests: /api/nfce/configuracao, /api/nfce/status-sefaz, /api/nfce/emitir, /api/nfce/historico
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@sussu.com"
TEST_PASSWORD = "admin123"


class TestAuth:
    """Authentication tests - must pass before NFC-e tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        return data["token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"Login successful for user: {data['user'].get('email')}")


class TestNFCeConfiguracao:
    """Tests for /api/nfce/configuracao endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_configuracao_returns_200(self, auth_headers):
        """Test that configuracao endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/nfce/configuracao", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Configuracao response: {response.json()}")
    
    def test_configuracao_has_certificado(self, auth_headers):
        """Test that configuracao returns certificado info"""
        response = requests.get(f"{BASE_URL}/api/nfce/configuracao", headers=auth_headers)
        data = response.json()
        assert "certificado" in data, "certificado field missing"
        print(f"Certificado info: {data['certificado']}")
    
    def test_configuracao_has_ambiente(self, auth_headers):
        """Test that configuracao returns ambiente (Homologação expected)"""
        response = requests.get(f"{BASE_URL}/api/nfce/configuracao", headers=auth_headers)
        data = response.json()
        assert "ambiente" in data, "ambiente field missing"
        assert data["ambiente"] == "Homologação", f"Expected Homologação, got {data['ambiente']}"
        print(f"Ambiente: {data['ambiente']}")
    
    def test_configuracao_requires_auth(self):
        """Test that configuracao requires authentication"""
        response = requests.get(f"{BASE_URL}/api/nfce/configuracao")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestNFCeStatusSefaz:
    """Tests for /api/nfce/status-sefaz endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_status_sefaz_returns_200(self, auth_headers):
        """Test that status-sefaz endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/nfce/status-sefaz", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Status SEFAZ response: {response.json()}")
    
    def test_status_sefaz_has_online_field(self, auth_headers):
        """Test that status-sefaz returns online field"""
        response = requests.get(f"{BASE_URL}/api/nfce/status-sefaz", headers=auth_headers)
        data = response.json()
        assert "online" in data, "online field missing"
        print(f"SEFAZ online: {data['online']}")
    
    def test_status_sefaz_has_codigo(self, auth_headers):
        """Test that status-sefaz returns codigo (107 = Serviço em Operação)"""
        response = requests.get(f"{BASE_URL}/api/nfce/status-sefaz", headers=auth_headers)
        data = response.json()
        assert "codigo" in data, "codigo field missing"
        # Note: 107 means service is operational
        print(f"SEFAZ codigo: {data['codigo']}, mensagem: {data.get('mensagem', 'N/A')}")
    
    def test_status_sefaz_requires_auth(self):
        """Test that status-sefaz requires authentication"""
        response = requests.get(f"{BASE_URL}/api/nfce/status-sefaz")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestNFCeEmitir:
    """Tests for /api/nfce/emitir endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_emitir_nfce_success(self, auth_headers):
        """Test NFC-e emission with valid data"""
        dados_nfce = {
            "venda_id": "test-venda-001",
            "items": [
                {
                    "codigo": "CHOC001",
                    "descricao": "Chocolate Trufado 100g",
                    "ncm": "18069000",
                    "cfop": "5102",
                    "unidade": "UN",
                    "quantidade": 2,
                    "valor_unitario": 25.00,
                    "valor_total": 50.00
                }
            ],
            "valor_produtos": 50.00,
            "valor_desconto": 0,
            "valor_total": 50.00,
            "forma_pagamento": "01",  # Dinheiro
            "valor_pago": 50.00,
            "valor_troco": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/nfce/emitir", json=dados_nfce, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "success field missing"
        print(f"Emitir NFC-e response: success={data.get('success')}, message={data.get('message')}")
        
        if data.get("success"):
            assert "chave_acesso" in data, "chave_acesso missing on success"
            assert "numero_nfce" in data, "numero_nfce missing on success"
            print(f"NFC-e emitida: chave={data.get('chave_acesso')}, numero={data.get('numero_nfce')}")
    
    def test_emitir_nfce_with_cliente(self, auth_headers):
        """Test NFC-e emission with cliente data"""
        dados_nfce = {
            "venda_id": "test-venda-002",
            "cliente": {
                "cpf": "12345678901",
                "nome": "Cliente Teste"
            },
            "items": [
                {
                    "codigo": "CHOC002",
                    "descricao": "Bombom Sortido 200g",
                    "ncm": "18069000",
                    "cfop": "5102",
                    "unidade": "UN",
                    "quantidade": 1,
                    "valor_unitario": 35.00,
                    "valor_total": 35.00
                }
            ],
            "valor_produtos": 35.00,
            "valor_desconto": 0,
            "valor_total": 35.00,
            "forma_pagamento": "03",  # Cartão Crédito
            "valor_pago": 35.00,
            "valor_troco": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/nfce/emitir", json=dados_nfce, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Emitir NFC-e com cliente: success={data.get('success')}")
    
    def test_emitir_nfce_requires_auth(self):
        """Test that emitir requires authentication"""
        dados_nfce = {
            "items": [],
            "valor_total": 0
        }
        response = requests.post(f"{BASE_URL}/api/nfce/emitir", json=dados_nfce)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestNFCeHistorico:
    """Tests for /api/nfce/historico endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_historico_returns_200(self, auth_headers):
        """Test that historico endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/nfce/historico", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Historico response: {response.json()}")
    
    def test_historico_has_items_and_total(self, auth_headers):
        """Test that historico returns items and total"""
        response = requests.get(f"{BASE_URL}/api/nfce/historico", headers=auth_headers)
        data = response.json()
        assert "items" in data, "items field missing"
        assert "total" in data, "total field missing"
        assert isinstance(data["items"], list), "items should be a list"
        print(f"Historico: {data['total']} NFC-e(s) encontrada(s)")
    
    def test_historico_with_pagination(self, auth_headers):
        """Test historico with limit and skip parameters"""
        response = requests.get(f"{BASE_URL}/api/nfce/historico?limit=10&skip=0", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 10, "Should respect limit parameter"
    
    def test_historico_requires_auth(self):
        """Test that historico requires authentication"""
        response = requests.get(f"{BASE_URL}/api/nfce/historico")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestVendasWithNFCe:
    """Tests for vendas integration with NFC-e"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_listar_vendas(self, auth_headers):
        """Test listing vendas"""
        response = requests.get(f"{BASE_URL}/api/vendas", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "vendas should be a list"
        print(f"Total vendas: {len(data)}")
        
        # Check for vendas with NFC-e status
        vendas_com_nfce = [v for v in data if v.get("nfce_emitida")]
        vendas_sem_nfce = [v for v in data if not v.get("nfce_emitida")]
        print(f"Vendas com NFC-e: {len(vendas_com_nfce)}, Vendas pendentes: {len(vendas_sem_nfce)}")
    
    def test_venda_has_nfce_fields(self, auth_headers):
        """Test that vendas have NFC-e related fields"""
        response = requests.get(f"{BASE_URL}/api/vendas", headers=auth_headers)
        data = response.json()
        
        if len(data) > 0:
            venda = data[0]
            # Check that nfce_emitida field exists
            assert "nfce_emitida" in venda, "nfce_emitida field missing in venda"
            print(f"Venda {venda.get('id')}: nfce_emitida={venda.get('nfce_emitida')}, nfce_chave={venda.get('nfce_chave')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
