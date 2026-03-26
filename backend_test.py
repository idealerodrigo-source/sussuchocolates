import requests
import sys
import json
from datetime import datetime

class SussuChocolatesAPITester:
    def __init__(self, base_url="https://sussu-manage.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.created_resources = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_auth_register(self):
        """Test user registration"""
        test_user_data = {
            "nome": "Test User",
            "email": f"test_{datetime.now().strftime('%H%M%S')}@sussu.com",
            "senha": "testpass123",
            "role": "admin"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success:
            self.created_resources.append(("user", response.get("user", {}).get("id")))
        
        return success, test_user_data

    def test_auth_login(self, email="admin@sussu.com", senha="admin123"):
        """Test login and get token"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "senha": senha}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True, response
        return False, {}

    def test_auth_me(self):
        """Test get current user"""
        return self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        return self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )

    def test_clientes_crud(self):
        """Test complete CRUD operations for clientes"""
        print("\n📋 Testing Clientes CRUD Operations...")
        
        # Create cliente
        cliente_data = {
            "nome": "Cliente Teste",
            "cpf": "12345678901",
            "telefone": "(11) 99999-9999",
            "email": "cliente@teste.com",
            "endereco": "Rua Teste, 123",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "01234-567"
        }
        
        success, response = self.run_test(
            "Create Cliente",
            "POST",
            "clientes",
            200,
            data=cliente_data
        )
        
        if not success:
            return False
        
        cliente_id = response.get('id')
        if cliente_id:
            self.created_resources.append(("cliente", cliente_id))
        
        # List clientes
        success, _ = self.run_test(
            "List Clientes",
            "GET",
            "clientes",
            200
        )
        
        if not success:
            return False
        
        # Get specific cliente
        if cliente_id:
            success, _ = self.run_test(
                "Get Cliente",
                "GET",
                f"clientes/{cliente_id}",
                200
            )
            
            if not success:
                return False
            
            # Update cliente
            update_data = {
                "nome": "Cliente Teste Atualizado",
                "telefone": "(11) 88888-8888"
            }
            
            success, _ = self.run_test(
                "Update Cliente",
                "PUT",
                f"clientes/{cliente_id}",
                200,
                data=update_data
            )
            
            if not success:
                return False
        
        return True

    def test_produtos_crud(self):
        """Test complete CRUD operations for produtos"""
        print("\n📦 Testing Produtos CRUD Operations...")
        
        # Create produto
        produto_data = {
            "nome": "Chocolate Teste",
            "descricao": "Chocolate artesanal para teste",
            "categoria": "Chocolate ao Leite",
            "preco": 25.90,
            "custo_producao": 15.50,
            "ncm_code": "18063210",
            "unidade": "UN"
        }
        
        success, response = self.run_test(
            "Create Produto",
            "POST",
            "produtos",
            200,
            data=produto_data
        )
        
        if not success:
            return False
        
        produto_id = response.get('id')
        if produto_id:
            self.created_resources.append(("produto", produto_id))
        
        # List produtos
        success, _ = self.run_test(
            "List Produtos",
            "GET",
            "produtos",
            200
        )
        
        return success

    def test_pedidos_workflow(self):
        """Test pedidos creation workflow"""
        print("\n🛒 Testing Pedidos Workflow...")
        
        # First need a cliente and produto
        cliente_data = {
            "nome": "Cliente Pedido",
            "email": "pedido@teste.com"
        }
        
        success, cliente_response = self.run_test(
            "Create Cliente for Pedido",
            "POST",
            "clientes",
            200,
            data=cliente_data
        )
        
        if not success:
            return False
        
        cliente_id = cliente_response.get('id')
        
        produto_data = {
            "nome": "Chocolate Pedido",
            "categoria": "Teste",
            "preco": 30.00
        }
        
        success, produto_response = self.run_test(
            "Create Produto for Pedido",
            "POST",
            "produtos",
            200,
            data=produto_data
        )
        
        if not success:
            return False
        
        produto_id = produto_response.get('id')
        
        # Create pedido
        pedido_data = {
            "cliente_id": cliente_id,
            "items": [
                {
                    "produto_id": produto_id,
                    "produto_nome": "Chocolate Pedido",
                    "quantidade": 2,
                    "preco_unitario": 30.00,
                    "subtotal": 60.00
                }
            ],
            "observacoes": "Pedido de teste"
        }
        
        success, pedido_response = self.run_test(
            "Create Pedido",
            "POST",
            "pedidos",
            200,
            data=pedido_data
        )
        
        if success:
            pedido_id = pedido_response.get('id')
            if pedido_id:
                self.created_resources.append(("pedido", pedido_id))
        
        return success

    def test_relatorios(self):
        """Test relatórios endpoints"""
        print("\n📊 Testing Relatórios...")
        
        success1, _ = self.run_test(
            "Relatório Vendas",
            "GET",
            "relatorios/vendas",
            200
        )
        
        success2, _ = self.run_test(
            "Relatório Produção",
            "GET",
            "relatorios/producao",
            200
        )
        
        success3, _ = self.run_test(
            "Relatório Clientes",
            "GET",
            "relatorios/clientes",
            200
        )
        
        return success1 and success2 and success3

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        for resource_type, resource_id in reversed(self.created_resources):
            if resource_id:
                if resource_type == "cliente":
                    self.run_test(
                        f"Delete {resource_type}",
                        "DELETE",
                        f"clientes/{resource_id}",
                        200
                    )
                elif resource_type == "produto":
                    self.run_test(
                        f"Delete {resource_type}",
                        "DELETE",
                        f"produtos/{resource_id}",
                        200
                    )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Sussu Chocolates API Tests...")
        print(f"Base URL: {self.base_url}")
        
        # Test authentication first
        print("\n🔐 Testing Authentication...")
        login_success, _ = self.test_auth_login()
        
        if not login_success:
            print("❌ Login failed - cannot proceed with authenticated tests")
            return False
        
        # Test user info
        self.test_auth_me()
        
        # Test registration
        self.test_auth_register()
        
        # Test dashboard
        print("\n📊 Testing Dashboard...")
        self.test_dashboard_stats()
        
        # Test CRUD operations
        self.test_clientes_crud()
        self.test_produtos_crud()
        
        # Test workflows
        self.test_pedidos_workflow()
        
        # Test reports
        self.test_relatorios()
        
        # Cleanup
        self.cleanup_resources()
        
        # Print results
        print(f"\n📊 Test Results:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
                print(f"  - {test['test']}: {error_msg}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SussuChocolatesAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())