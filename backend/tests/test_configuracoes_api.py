"""
Test suite for Configurações API - Usuários and Empresa management
Tests CRUD operations for users and company data management
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "rodrigo_busatta@hotmail.com"
ADMIN_PASSWORD = "admin123"


class TestAuth:
    """Authentication tests"""
    
    def test_login_admin_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "senha": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful - user: {data['user']['nome']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@email.com",
            "senha": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")


@pytest.fixture(scope="class")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "senha": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="class")
def admin_user_id():
    """Get admin user ID"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "senha": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["user"]["id"]
    pytest.skip("Admin authentication failed")


class TestUsuariosAPI:
    """Tests for /api/configuracoes/usuarios endpoints"""
    
    def test_listar_usuarios(self, admin_token):
        """Test listing all users (admin only)"""
        response = requests.get(
            f"{BASE_URL}/api/configuracoes/usuarios",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to list users: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} users")
        
        # Verify admin user exists in list
        admin_found = any(u["email"] == ADMIN_EMAIL for u in data)
        assert admin_found, "Admin user not found in list"
        print("✓ Admin user found in list")
    
    def test_criar_usuario_vendedor(self, admin_token):
        """Test creating a new user with 'vendedor' role"""
        unique_email = f"TEST_vendedor_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/configuracoes/usuarios",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "nome": "Test Vendedor",
                "email": unique_email,
                "senha": "vendedor123",
                "role": "vendedor",
                "ativo": True
            }
        )
        assert response.status_code == 200, f"Failed to create user: {response.text}"
        data = response.json()
        assert "usuario" in data
        assert data["usuario"]["email"] == unique_email
        assert data["usuario"]["role"] == "vendedor"
        print(f"✓ Created vendedor user: {unique_email}")
        
        # Verify user was persisted by fetching list
        list_response = requests.get(
            f"{BASE_URL}/api/configuracoes/usuarios",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = list_response.json()
        created_user = next((u for u in users if u["email"] == unique_email), None)
        assert created_user is not None, "Created user not found in list"
        assert created_user["role"] == "vendedor"
        print("✓ User persisted and verified in database")
        
        # Cleanup - delete the test user
        user_id = data["usuario"]["id"]
        requests.delete(
            f"{BASE_URL}/api/configuracoes/usuarios/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_criar_usuario_producao(self, admin_token):
        """Test creating a new user with 'producao' role"""
        unique_email = f"TEST_producao_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/configuracoes/usuarios",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "nome": "Test Producao",
                "email": unique_email,
                "senha": "producao123",
                "role": "producao",
                "ativo": True
            }
        )
        assert response.status_code == 200, f"Failed to create user: {response.text}"
        data = response.json()
        assert data["usuario"]["role"] == "producao"
        print(f"✓ Created producao user: {unique_email}")
        
        # Cleanup
        user_id = data["usuario"]["id"]
        requests.delete(
            f"{BASE_URL}/api/configuracoes/usuarios/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_criar_usuario_email_duplicado(self, admin_token):
        """Test that duplicate email is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/configuracoes/usuarios",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "nome": "Duplicate User",
                "email": ADMIN_EMAIL,  # Already exists
                "senha": "test123",
                "role": "vendedor",
                "ativo": True
            }
        )
        assert response.status_code == 400, "Should reject duplicate email"
        print("✓ Duplicate email rejected correctly")
    
    def test_atualizar_usuario(self, admin_token):
        """Test updating an existing user"""
        # First create a user
        unique_email = f"TEST_update_{uuid.uuid4().hex[:8]}@test.com"
        create_response = requests.post(
            f"{BASE_URL}/api/configuracoes/usuarios",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "nome": "Original Name",
                "email": unique_email,
                "senha": "test123",
                "role": "vendedor",
                "ativo": True
            }
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["usuario"]["id"]
        
        # Update the user
        update_response = requests.put(
            f"{BASE_URL}/api/configuracoes/usuarios/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "nome": "Updated Name",
                "role": "producao"
            }
        )
        assert update_response.status_code == 200, f"Failed to update user: {update_response.text}"
        print("✓ User updated successfully")
        
        # Verify update was persisted
        list_response = requests.get(
            f"{BASE_URL}/api/configuracoes/usuarios",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = list_response.json()
        updated_user = next((u for u in users if u["id"] == user_id), None)
        assert updated_user is not None
        assert updated_user["nome"] == "Updated Name"
        assert updated_user["role"] == "producao"
        print("✓ Update persisted and verified")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/configuracoes/usuarios/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_deletar_usuario(self, admin_token):
        """Test deleting a user"""
        # First create a user
        unique_email = f"TEST_delete_{uuid.uuid4().hex[:8]}@test.com"
        create_response = requests.post(
            f"{BASE_URL}/api/configuracoes/usuarios",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "nome": "To Be Deleted",
                "email": unique_email,
                "senha": "test123",
                "role": "vendedor",
                "ativo": True
            }
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["usuario"]["id"]
        
        # Delete the user
        delete_response = requests.delete(
            f"{BASE_URL}/api/configuracoes/usuarios/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200, f"Failed to delete user: {delete_response.text}"
        print("✓ User deleted successfully")
        
        # Verify user no longer exists
        list_response = requests.get(
            f"{BASE_URL}/api/configuracoes/usuarios",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = list_response.json()
        deleted_user = next((u for u in users if u["id"] == user_id), None)
        assert deleted_user is None, "Deleted user still exists"
        print("✓ User removal verified")
    
    def test_admin_cannot_delete_self(self, admin_token, admin_user_id):
        """Test that admin cannot delete their own account"""
        response = requests.delete(
            f"{BASE_URL}/api/configuracoes/usuarios/{admin_user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400, "Admin should not be able to delete self"
        data = response.json()
        assert "próprio" in data.get("detail", "").lower() or "próprio" in str(data).lower()
        print("✓ Admin self-deletion correctly prevented")
    
    def test_unauthorized_access(self):
        """Test that unauthenticated requests are rejected"""
        response = requests.get(f"{BASE_URL}/api/configuracoes/usuarios")
        assert response.status_code in [401, 403], "Should reject unauthenticated request"
        print("✓ Unauthenticated access rejected")


class TestEmpresaAPI:
    """Tests for /api/configuracoes/empresa endpoints"""
    
    def test_obter_empresa(self, admin_token):
        """Test getting company data"""
        response = requests.get(
            f"{BASE_URL}/api/configuracoes/empresa",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get empresa: {response.text}"
        data = response.json()
        
        # Verify expected fields exist
        expected_fields = ["nome", "cnpj", "cidade", "estado"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Got empresa data: {data.get('nome', 'N/A')}")
        print(f"  CNPJ: {data.get('cnpj', 'N/A')}")
        print(f"  Cidade: {data.get('cidade', 'N/A')}/{data.get('estado', 'N/A')}")
    
    def test_atualizar_empresa(self, admin_token):
        """Test updating company data"""
        # First get current data
        get_response = requests.get(
            f"{BASE_URL}/api/configuracoes/empresa",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_data = get_response.json()
        original_telefone = original_data.get("telefone", "")
        
        # Update with new data
        new_telefone = "(43) 99999-8888"
        update_response = requests.put(
            f"{BASE_URL}/api/configuracoes/empresa",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"telefone": new_telefone}
        )
        assert update_response.status_code == 200, f"Failed to update empresa: {update_response.text}"
        print("✓ Empresa updated successfully")
        
        # Verify update was persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/configuracoes/empresa",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        updated_data = verify_response.json()
        assert updated_data.get("telefone") == new_telefone, "Update not persisted"
        print("✓ Update persisted and verified")
        
        # Restore original value
        requests.put(
            f"{BASE_URL}/api/configuracoes/empresa",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"telefone": original_telefone}
        )


class TestLogoAPI:
    """Tests for /api/configuracoes/empresa/logo endpoints"""
    
    def test_upload_logo(self, admin_token):
        """Test uploading a company logo"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        # Minimal valid PNG (1x1 transparent pixel)
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test_logo.png', png_data, 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/configuracoes/empresa/logo",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        assert response.status_code == 200, f"Failed to upload logo: {response.text}"
        data = response.json()
        assert "logo" in data
        assert data["logo"].startswith("data:image/png;base64,")
        print("✓ Logo uploaded successfully")
        
        # Verify logo is persisted in empresa data
        empresa_response = requests.get(
            f"{BASE_URL}/api/configuracoes/empresa",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        empresa_data = empresa_response.json()
        assert empresa_data.get("logo") is not None
        print("✓ Logo persisted in empresa data")
    
    def test_remover_logo(self, admin_token):
        """Test removing company logo"""
        response = requests.delete(
            f"{BASE_URL}/api/configuracoes/empresa/logo",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to remove logo: {response.text}"
        print("✓ Logo removed successfully")
        
        # Verify logo is null in empresa data
        empresa_response = requests.get(
            f"{BASE_URL}/api/configuracoes/empresa",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        empresa_data = empresa_response.json()
        assert empresa_data.get("logo") is None
        print("✓ Logo removal verified")
    
    def test_upload_invalid_file_type(self, admin_token):
        """Test that invalid file types are rejected"""
        files = {
            'file': ('test.txt', b'not an image', 'text/plain')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/configuracoes/empresa/logo",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        assert response.status_code == 400, "Should reject non-image files"
        print("✓ Invalid file type rejected correctly")


class TestRBACAccess:
    """Tests for Role-Based Access Control"""
    
    def test_vendedor_cannot_access_usuarios(self, admin_token):
        """Test that vendedor role cannot access user management"""
        # First create a vendedor user
        unique_email = f"TEST_rbac_vendedor_{uuid.uuid4().hex[:8]}@test.com"
        create_response = requests.post(
            f"{BASE_URL}/api/configuracoes/usuarios",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "nome": "RBAC Test Vendedor",
                "email": unique_email,
                "senha": "vendedor123",
                "role": "vendedor",
                "ativo": True
            }
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["usuario"]["id"]
        
        # Login as vendedor
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "senha": "vendedor123"
        })
        assert login_response.status_code == 200
        vendedor_token = login_response.json()["token"]
        
        # Try to access usuarios list
        usuarios_response = requests.get(
            f"{BASE_URL}/api/configuracoes/usuarios",
            headers={"Authorization": f"Bearer {vendedor_token}"}
        )
        assert usuarios_response.status_code == 403, "Vendedor should not access usuarios"
        print("✓ Vendedor correctly denied access to usuarios")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/configuracoes/usuarios/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_vendedor_can_access_empresa(self, admin_token):
        """Test that vendedor role can view empresa data (read-only)"""
        # First create a vendedor user
        unique_email = f"TEST_rbac_empresa_{uuid.uuid4().hex[:8]}@test.com"
        create_response = requests.post(
            f"{BASE_URL}/api/configuracoes/usuarios",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "nome": "RBAC Test Empresa",
                "email": unique_email,
                "senha": "vendedor123",
                "role": "vendedor",
                "ativo": True
            }
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["usuario"]["id"]
        
        # Login as vendedor
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "senha": "vendedor123"
        })
        assert login_response.status_code == 200
        vendedor_token = login_response.json()["token"]
        
        # Try to view empresa data (should work)
        empresa_response = requests.get(
            f"{BASE_URL}/api/configuracoes/empresa",
            headers={"Authorization": f"Bearer {vendedor_token}"}
        )
        assert empresa_response.status_code == 200, "Vendedor should be able to view empresa"
        print("✓ Vendedor can view empresa data")
        
        # Try to update empresa data (should fail)
        update_response = requests.put(
            f"{BASE_URL}/api/configuracoes/empresa",
            headers={"Authorization": f"Bearer {vendedor_token}"},
            json={"telefone": "(99) 99999-9999"}
        )
        assert update_response.status_code == 403, "Vendedor should not update empresa"
        print("✓ Vendedor correctly denied empresa update")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/configuracoes/usuarios/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
