"""
Test suite for Venda Mista (Mixed Sale) feature
Tests:
1. Create direct sale with mixed items (immediate + to_produce)
2. Verify automatic order creation for 'a_produzir' items
3. Verify stock movement only for 'imediata' items
4. Verify sales list shows 'Produção' indicator for sales with items to produce
5. Verify flavors are saved and displayed correctly in items
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review_request
TEST_EMAIL = "admin@sussu.com"
TEST_SENHA = "123456"


class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_SENHA
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "senha": TEST_SENHA
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def test_cliente(auth_headers):
    """Create or get a test client"""
    # First try to get existing clients
    response = requests.get(f"{BASE_URL}/api/clientes", headers=auth_headers)
    if response.status_code == 200 and len(response.json()) > 0:
        return response.json()[0]
    
    # Create a new client if none exists
    cliente_data = {
        "nome": "TEST_Cliente Venda Mista",
        "email": "test_venda_mista@test.com",
        "telefone": "(11) 99999-9999"
    }
    response = requests.post(f"{BASE_URL}/api/clientes", json=cliente_data, headers=auth_headers)
    assert response.status_code in [200, 201], f"Failed to create client: {response.text}"
    return response.json()


@pytest.fixture(scope="module")
def test_produtos(auth_headers):
    """Get test products"""
    response = requests.get(f"{BASE_URL}/api/produtos", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get products: {response.text}"
    produtos = response.json()
    assert len(produtos) >= 2, "Need at least 2 products for mixed sale test"
    return produtos[:2]


class TestVendaMista:
    """Tests for Venda Mista (Mixed Sale) feature"""
    
    def test_criar_venda_direta_apenas_imediata(self, auth_headers, test_cliente, test_produtos):
        """Test creating a direct sale with only immediate delivery items"""
        produto = test_produtos[0]
        
        venda_data = {
            "cliente_id": test_cliente["id"],
            "items": [
                {
                    "produto_id": produto["id"],
                    "produto_nome": produto["nome"],
                    "quantidade": 1,
                    "preco_unitario": produto["preco"],
                    "subtotal": produto["preco"],
                    "tipo_entrega": "imediata"
                }
            ],
            "forma_pagamento": "Dinheiro",
            "parcelas": 1,
            "tipo_venda": "direta",
            "entrega_posterior": False,
            "status_pagamento": "pago",
            "tem_itens_a_produzir": False
        }
        
        response = requests.post(f"{BASE_URL}/api/vendas", json=venda_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create sale: {response.text}"
        
        venda = response.json()
        assert venda["tipo_venda"] == "direta"
        assert venda["tem_itens_a_produzir"] == False
        assert len(venda["items"]) == 1
        assert venda["items"][0]["tipo_entrega"] == "imediata"
        
        return venda
    
    def test_criar_venda_mista_com_itens_a_produzir(self, auth_headers, test_cliente, test_produtos):
        """Test creating a mixed sale with both immediate and to-produce items"""
        produto_imediato = test_produtos[0]
        produto_a_produzir = test_produtos[1] if len(test_produtos) > 1 else test_produtos[0]
        
        venda_data = {
            "cliente_id": test_cliente["id"],
            "items": [
                {
                    "produto_id": produto_imediato["id"],
                    "produto_nome": produto_imediato["nome"],
                    "quantidade": 2,
                    "preco_unitario": produto_imediato["preco"],
                    "subtotal": produto_imediato["preco"] * 2,
                    "tipo_entrega": "imediata"
                },
                {
                    "produto_id": produto_a_produzir["id"],
                    "produto_nome": produto_a_produzir["nome"],
                    "quantidade": 3,
                    "preco_unitario": produto_a_produzir["preco"],
                    "subtotal": produto_a_produzir["preco"] * 3,
                    "tipo_entrega": "a_produzir"
                }
            ],
            "forma_pagamento": "PIX",
            "parcelas": 1,
            "tipo_venda": "direta",
            "entrega_posterior": False,
            "status_pagamento": "pago",
            "tem_itens_a_produzir": True
        }
        
        response = requests.post(f"{BASE_URL}/api/vendas", json=venda_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create mixed sale: {response.text}"
        
        venda = response.json()
        assert venda["tipo_venda"] == "direta"
        assert venda["tem_itens_a_produzir"] == True, "tem_itens_a_produzir should be True"
        assert len(venda["items"]) == 2
        
        # Verify items have correct tipo_entrega
        itens_imediatos = [i for i in venda["items"] if i.get("tipo_entrega") == "imediata"]
        itens_a_produzir = [i for i in venda["items"] if i.get("tipo_entrega") == "a_produzir"]
        
        assert len(itens_imediatos) == 1, "Should have 1 immediate item"
        assert len(itens_a_produzir) == 1, "Should have 1 to-produce item"
        
        return venda
    
    def test_criar_venda_mista_com_sabores(self, auth_headers, test_cliente, test_produtos):
        """Test creating a mixed sale with flavors in items"""
        produto = test_produtos[0]
        
        sabores = [
            {"sabor": "Chocolate", "quantidade": 0.5},
            {"sabor": "Morango", "quantidade": 0.5}
        ]
        
        venda_data = {
            "cliente_id": test_cliente["id"],
            "items": [
                {
                    "produto_id": produto["id"],
                    "produto_nome": produto["nome"],
                    "quantidade": 1,
                    "preco_unitario": produto["preco"],
                    "subtotal": produto["preco"],
                    "tipo_entrega": "a_produzir",
                    "sabores": sabores
                }
            ],
            "forma_pagamento": "Cartão de Crédito",
            "parcelas": 2,
            "tipo_venda": "direta",
            "entrega_posterior": False,
            "status_pagamento": "pago",
            "tem_itens_a_produzir": True
        }
        
        response = requests.post(f"{BASE_URL}/api/vendas", json=venda_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create sale with flavors: {response.text}"
        
        venda = response.json()
        assert venda["tem_itens_a_produzir"] == True
        
        # Verify sabores are saved
        item = venda["items"][0]
        assert item.get("sabores") is not None, "Sabores should be saved"
        assert len(item["sabores"]) == 2, "Should have 2 flavors"
        
        # Verify flavor details
        sabor_names = [s["sabor"] for s in item["sabores"]]
        assert "Chocolate" in sabor_names
        assert "Morango" in sabor_names
        
        return venda
    
    def test_listar_vendas_com_indicador_producao(self, auth_headers):
        """Test that sales list shows 'Produção' indicator for sales with items to produce"""
        response = requests.get(f"{BASE_URL}/api/vendas", headers=auth_headers)
        assert response.status_code == 200, f"Failed to list sales: {response.text}"
        
        vendas = response.json()
        assert len(vendas) > 0, "Should have at least one sale"
        
        # Find sales with tem_itens_a_produzir = True
        vendas_com_producao = [v for v in vendas if v.get("tem_itens_a_produzir") == True]
        
        # Verify the field exists in the response
        for venda in vendas:
            assert "tem_itens_a_produzir" in venda, "tem_itens_a_produzir field should exist in response"
        
        print(f"Found {len(vendas_com_producao)} sales with production items out of {len(vendas)} total")
        return vendas
    
    def test_verificar_movimentacao_estoque_apenas_imediata(self, auth_headers, test_cliente, test_produtos):
        """Test that stock movement only happens for immediate delivery items"""
        # Get initial stock movements count
        response = requests.get(f"{BASE_URL}/api/estoque", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get stock: {response.text}"
        estoque_inicial = response.json()
        count_inicial = len(estoque_inicial)
        
        # Create a mixed sale
        produto_imediato = test_produtos[0]
        produto_a_produzir = test_produtos[1] if len(test_produtos) > 1 else test_produtos[0]
        
        venda_data = {
            "cliente_id": test_cliente["id"],
            "items": [
                {
                    "produto_id": produto_imediato["id"],
                    "produto_nome": produto_imediato["nome"],
                    "quantidade": 1,
                    "preco_unitario": produto_imediato["preco"],
                    "subtotal": produto_imediato["preco"],
                    "tipo_entrega": "imediata"
                },
                {
                    "produto_id": produto_a_produzir["id"],
                    "produto_nome": produto_a_produzir["nome"],
                    "quantidade": 1,
                    "preco_unitario": produto_a_produzir["preco"],
                    "subtotal": produto_a_produzir["preco"],
                    "tipo_entrega": "a_produzir"
                }
            ],
            "forma_pagamento": "Dinheiro",
            "parcelas": 1,
            "tipo_venda": "direta",
            "entrega_posterior": False,
            "status_pagamento": "pago",
            "tem_itens_a_produzir": True
        }
        
        response = requests.post(f"{BASE_URL}/api/vendas", json=venda_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create sale: {response.text}"
        venda = response.json()
        
        # Get stock movements after sale
        response = requests.get(f"{BASE_URL}/api/estoque", headers=auth_headers)
        assert response.status_code == 200
        estoque_final = response.json()
        count_final = len(estoque_final)
        
        # Should have only 1 new movement (for the immediate item, not the a_produzir item)
        novos_movimentos = count_final - count_inicial
        assert novos_movimentos == 1, f"Expected 1 new stock movement (only for immediate item), got {novos_movimentos}"
        
        # Verify the movement is for the immediate item
        ultimo_movimento = estoque_final[0]  # Most recent should be first
        assert ultimo_movimento["tipo_movimento"] == "saida", "Movement should be 'saida' (exit)"
        assert ultimo_movimento["produto_id"] == produto_imediato["id"], "Movement should be for immediate product"
        
        return venda


class TestPedidoAutomaticoVendaMista:
    """Tests for automatic order creation from mixed sales"""
    
    def test_pedido_criado_automaticamente_para_itens_a_produzir(self, auth_headers, test_cliente, test_produtos):
        """Test that an order is automatically created for 'a_produzir' items"""
        # Get initial orders count
        response = requests.get(f"{BASE_URL}/api/pedidos", headers=auth_headers)
        assert response.status_code == 200
        pedidos_inicial = response.json()
        count_inicial = len(pedidos_inicial)
        
        # Create a mixed sale with a_produzir items
        produto = test_produtos[0]
        
        venda_data = {
            "cliente_id": test_cliente["id"],
            "items": [
                {
                    "produto_id": produto["id"],
                    "produto_nome": produto["nome"],
                    "quantidade": 5,
                    "preco_unitario": produto["preco"],
                    "subtotal": produto["preco"] * 5,
                    "tipo_entrega": "a_produzir",
                    "sabores": [{"sabor": "Brigadeiro", "quantidade": 5}]
                }
            ],
            "forma_pagamento": "PIX",
            "parcelas": 1,
            "tipo_venda": "direta",
            "entrega_posterior": False,
            "status_pagamento": "pago",
            "tem_itens_a_produzir": True
        }
        
        response = requests.post(f"{BASE_URL}/api/vendas", json=venda_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create sale: {response.text}"
        venda = response.json()
        
        # Note: The automatic order creation happens in the FRONTEND (VendasPage.js handleSubmit)
        # The backend only creates the sale. The frontend then calls pedidosAPI.criar()
        # So we can't test automatic order creation via backend API alone
        
        # However, we can verify the sale was created correctly with tem_itens_a_produzir=True
        assert venda["tem_itens_a_produzir"] == True
        
        return venda
    
    def test_criar_pedido_vinculado_a_venda(self, auth_headers, test_cliente, test_produtos):
        """Test creating an order linked to a sale (simulating frontend behavior)"""
        # First create a sale
        produto = test_produtos[0]
        
        venda_data = {
            "cliente_id": test_cliente["id"],
            "items": [
                {
                    "produto_id": produto["id"],
                    "produto_nome": produto["nome"],
                    "quantidade": 2,
                    "preco_unitario": produto["preco"],
                    "subtotal": produto["preco"] * 2,
                    "tipo_entrega": "a_produzir"
                }
            ],
            "forma_pagamento": "Dinheiro",
            "parcelas": 1,
            "tipo_venda": "direta",
            "entrega_posterior": False,
            "status_pagamento": "pago",
            "tem_itens_a_produzir": True
        }
        
        response = requests.post(f"{BASE_URL}/api/vendas", json=venda_data, headers=auth_headers)
        assert response.status_code == 200
        venda = response.json()
        
        # Now create an order linked to this sale (simulating frontend behavior)
        pedido_data = {
            "cliente_id": test_cliente["id"],
            "items": [
                {
                    "produto_id": produto["id"],
                    "produto_nome": produto["nome"],
                    "quantidade": 2,
                    "preco_unitario": produto["preco"],
                    "subtotal": produto["preco"] * 2
                }
            ],
            "observacoes": "Pedido gerado automaticamente pela venda. Itens para produção e entrega posterior.",
            "venda_vinculada_id": venda["id"],
            "origem": "venda_mista"
        }
        
        response = requests.post(f"{BASE_URL}/api/pedidos", json=pedido_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create linked order: {response.text}"
        
        pedido = response.json()
        assert pedido["venda_vinculada_id"] == venda["id"], "Order should be linked to sale"
        assert pedido["origem"] == "venda_mista", "Order origin should be 'venda_mista'"
        assert "PED-" in pedido["numero"], "Order should have a number"
        
        return pedido


class TestVendaMistaValidation:
    """Validation tests for Venda Mista"""
    
    def test_venda_direta_sem_cliente_falha(self, auth_headers, test_produtos):
        """Test that direct sale without client fails"""
        produto = test_produtos[0]
        
        venda_data = {
            "cliente_id": None,  # No client
            "items": [
                {
                    "produto_id": produto["id"],
                    "produto_nome": produto["nome"],
                    "quantidade": 1,
                    "preco_unitario": produto["preco"],
                    "subtotal": produto["preco"],
                    "tipo_entrega": "imediata"
                }
            ],
            "forma_pagamento": "Dinheiro",
            "tipo_venda": "direta"
        }
        
        response = requests.post(f"{BASE_URL}/api/vendas", json=venda_data, headers=auth_headers)
        assert response.status_code == 400, f"Should fail without client, got {response.status_code}"
    
    def test_venda_direta_sem_items_falha(self, auth_headers, test_cliente):
        """Test that direct sale without items fails"""
        venda_data = {
            "cliente_id": test_cliente["id"],
            "items": [],  # No items
            "forma_pagamento": "Dinheiro",
            "tipo_venda": "direta"
        }
        
        response = requests.post(f"{BASE_URL}/api/vendas", json=venda_data, headers=auth_headers)
        assert response.status_code == 400, f"Should fail without items, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
