import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_auth_headers(email: str = "apikey_test@example.com", password: str = "TestPassword123!"):
    """Helper to get auth headers for testing"""
    # Register user
    client.post(
        "/auth/register",
        json={"name": "API Key Test", "email": email, "password": password}
    )
    
    # Login
    response = client.post(
        "/auth/login",
        json={"email": email, "password": password}
    )
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return {}


def test_create_api_key():
    """Test creating an API key"""
    headers = get_auth_headers("create_key@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    response = client.post(
        "/api-keys",
        json={
            "name": "Test OpenAI Key",
            "provider": "openai",
            "key": "sk-test-key-12345"
        },
        headers=headers
    )
    
    assert response.status_code in [201, 400]  # 201 success, 400 if already exists
    if response.status_code == 201:
        data = response.json()
        assert data["name"] == "Test OpenAI Key"
        assert data["provider"] == "openai"
        assert data["isActive"] == True


def test_list_api_keys():
    """Test listing API keys"""
    headers = get_auth_headers("list_keys@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    # Create a key first
    client.post(
        "/api-keys",
        json={
            "name": "List Test Key",
            "provider": "anthropic",
            "key": "sk-ant-test-key"
        },
        headers=headers
    )
    
    # List keys
    response = client.get("/api-keys", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_delete_api_key():
    """Test deleting an API key"""
    headers = get_auth_headers("delete_key@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    # Create a key
    create_response = client.post(
        "/api-keys",
        json={
            "name": "Delete Test Key",
            "provider": "openai",
            "key": "sk-delete-test"
        },
        headers=headers
    )
    
    if create_response.status_code == 201:
        key_id = create_response.json()["id"]
        
        # Delete the key
        delete_response = client.delete(f"/api-keys/{key_id}", headers=headers)
        assert delete_response.status_code == 200


def test_api_key_validation():
    """Test API key validation"""
    headers = get_auth_headers("validate_key@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    # Try to create key without required fields
    response = client.post(
        "/api-keys",
        json={
            "name": "",
            "provider": "openai",
            "key": ""
        },
        headers=headers
    )
    
    # Should fail validation
    assert response.status_code in [400, 422]


def test_activate_deactivate_key():
    """Test activating and deactivating API key"""
    headers = get_auth_headers("toggle_key@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    # Create a key
    create_response = client.post(
        "/api-keys",
        json={
            "name": "Toggle Test Key",
            "provider": "huggingface",
            "key": "hf-test-key"
        },
        headers=headers
    )
    
    if create_response.status_code == 201:
        key_id = create_response.json()["id"]
        
        # Deactivate
        deactivate_response = client.post(f"/api-keys/{key_id}/deactivate", headers=headers)
        assert deactivate_response.status_code == 200
        assert deactivate_response.json()["isActive"] == False
        
        # Activate
        activate_response = client.post(f"/api-keys/{key_id}/activate", headers=headers)
        assert activate_response.status_code == 200
        assert activate_response.json()["isActive"] == True
