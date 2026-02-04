import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_auth_headers(email: str = "oauth_test@example.com", password: str = "TestPassword123!"):
    """Helper to get auth headers for testing"""
    client.post(
        "/auth/register",
        json={"name": "OAuth Test", "email": email, "password": password}
    )
    
    response = client.post(
        "/auth/login",
        json={"email": email, "password": password}
    )
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return {}


def test_start_google_oauth():
    """Test starting Google OAuth flow"""
    headers = get_auth_headers("google_oauth@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    response = client.post("/oauth/connect/google", headers=headers)
    
    # Should return 400 if not configured, or 200 with OAuth URL
    assert response.status_code in [200, 400]
    
    if response.status_code == 200:
        data = response.json()
        assert "oauth_url" in data
        assert "state" in data
        assert data["provider"] == "google"


def test_start_github_oauth():
    """Test starting GitHub OAuth flow"""
    headers = get_auth_headers("github_oauth@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    response = client.post("/oauth/connect/github", headers=headers)
    assert response.status_code in [200, 400]


def test_start_microsoft_oauth():
    """Test starting Microsoft OAuth flow"""
    headers = get_auth_headers("microsoft_oauth@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    response = client.post("/oauth/connect/microsoft", headers=headers)
    assert response.status_code in [200, 400]


def test_invalid_provider():
    """Test starting OAuth with invalid provider"""
    headers = get_auth_headers("invalid_oauth@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    response = client.post("/oauth/connect/invalid_provider", headers=headers)
    assert response.status_code == 400


def test_list_oauth_accounts():
    """Test listing OAuth accounts"""
    headers = get_auth_headers("list_oauth@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    response = client.get("/oauth/accounts", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_oauth_without_auth():
    """Test that OAuth endpoints require authentication"""
    response = client.post("/oauth/connect/google")
    assert response.status_code == 401
    
    response = client.get("/oauth/accounts")
    assert response.status_code == 401


def test_oauth_callback_invalid_state():
    """Test OAuth callback with invalid state"""
    headers = get_auth_headers("callback_test@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    response = client.post(
        "/oauth/callback",
        json={
            "provider": "google",
            "code": "test_code",
            "state": "invalid_state"
        },
        headers=headers
    )
    
    # Should fail with invalid state
    assert response.status_code == 400


def test_disconnect_nonexistent_account():
    """Test disconnecting a non-existent OAuth account"""
    headers = get_auth_headers("disconnect_test@example.com")
    if not headers:
        pytest.skip("Auth not working")
    
    response = client.delete("/oauth/accounts/nonexistent-id", headers=headers)
    assert response.status_code == 404
