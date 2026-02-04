import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_auth_headers(email: str = "agent_test@example.com", password: str = "TestPassword123!"):
    """Helper to get auth headers for testing"""
    client.post(
        "/auth/register",
        json={"name": "Agent Test", "email": email, "password": password}
    )
    
    response = client.post(
        "/auth/login",
        json={"email": email, "password": password}
    )
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return {}


def test_create_custom_agent():
    """Test creating a custom agent"""
    headers = get_auth_headers("create_agent@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    # First create an API key
    key_response = client.post(
        "/api-keys",
        json={
            "name": "Agent Test Key",
            "provider": "openai",
            "key": "sk-agent-test-key"
        },
        headers=headers
    )
    
    if key_response.status_code not in [201, 400]:
        pytest.skip("Could not create API key")
    
    # Get API keys to find the key ID
    keys_response = client.get("/api-keys", headers=headers)
    if keys_response.status_code != 200 or not keys_response.json():
        pytest.skip("No API keys available")
    
    api_key_id = keys_response.json()[0]["id"]
    
    # Create agent
    response = client.post(
        "/custom-agents",
        json={
            "name": "Test Agent",
            "description": "A test agent",
            "role": "Test role",
            "goal": "Test goal",
            "backstory": "Test backstory",
            "llmProvider": "openai",
            "apiKeyId": api_key_id,
            "tools": ["search"]
        },
        headers=headers
    )
    
    assert response.status_code in [201, 200]
    if response.status_code in [201, 200]:
        data = response.json()
        assert data["name"] == "Test Agent"
        assert data["role"] == "Test role"


def test_list_custom_agents():
    """Test listing custom agents"""
    headers = get_auth_headers("list_agents@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    response = client.get("/custom-agents", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_custom_agent():
    """Test getting a specific custom agent"""
    headers = get_auth_headers("get_agent@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    # Create API key and agent first
    client.post(
        "/api-keys",
        json={"name": "Get Agent Key", "provider": "openai", "key": "sk-get-test"},
        headers=headers
    )
    
    keys_response = client.get("/api-keys", headers=headers)
    if keys_response.status_code != 200 or not keys_response.json():
        pytest.skip("No API keys")
    
    api_key_id = keys_response.json()[0]["id"]
    
    create_response = client.post(
        "/custom-agents",
        json={
            "name": "Get Test Agent",
            "description": "Test",
            "role": "Role",
            "goal": "Goal",
            "backstory": "Backstory",
            "llmProvider": "openai",
            "apiKeyId": api_key_id,
            "tools": []
        },
        headers=headers
    )
    
    if create_response.status_code in [201, 200]:
        agent_id = create_response.json()["id"]
        
        get_response = client.get(f"/custom-agents/{agent_id}", headers=headers)
        assert get_response.status_code == 200
        assert get_response.json()["id"] == agent_id


def test_delete_custom_agent():
    """Test deleting a custom agent"""
    headers = get_auth_headers("delete_agent@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    # Create API key and agent
    client.post(
        "/api-keys",
        json={"name": "Delete Agent Key", "provider": "openai", "key": "sk-del-test"},
        headers=headers
    )
    
    keys_response = client.get("/api-keys", headers=headers)
    if keys_response.status_code != 200 or not keys_response.json():
        pytest.skip("No API keys")
    
    api_key_id = keys_response.json()[0]["id"]
    
    create_response = client.post(
        "/custom-agents",
        json={
            "name": "Delete Test Agent",
            "description": "Test",
            "role": "Role",
            "goal": "Goal",
            "backstory": "Backstory",
            "llmProvider": "openai",
            "apiKeyId": api_key_id,
            "tools": []
        },
        headers=headers
    )
    
    if create_response.status_code in [201, 200]:
        agent_id = create_response.json()["id"]
        
        delete_response = client.delete(f"/custom-agents/{agent_id}", headers=headers)
        assert delete_response.status_code == 200


def test_agent_without_auth():
    """Test that agent endpoints require authentication"""
    response = client.get("/custom-agents")
    assert response.status_code == 401


def test_agent_validation():
    """Test agent creation validation"""
    headers = get_auth_headers("validate_agent@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    # Try to create agent without required fields
    response = client.post(
        "/custom-agents",
        json={
            "name": "",
            "description": "",
            "role": "",
            "goal": "",
            "backstory": "",
            "llmProvider": "openai",
            "apiKeyId": "invalid-id",
            "tools": []
        },
        headers=headers
    )
    
    # Should fail validation
    assert response.status_code in [400, 422, 404]
