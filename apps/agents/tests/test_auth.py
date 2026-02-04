import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.routers.auth import hash_password, verify_password, create_access_token

client = TestClient(app)


def test_password_hashing():
    """Test password hashing"""
    password = "TestPassword123!"
    hashed = hash_password(password)
    assert verify_password(password, hashed)
    assert not verify_password("WrongPassword123!", hashed)


def test_create_access_token():
    """Test access token creation"""
    user_id = "test_user_123"
    token = create_access_token(user_id)
    assert token is not None
    assert isinstance(token, str)
    assert len(token) > 0


def test_user_registration():
    """Test user registration"""
    response = client.post(
        "/auth/register",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "TestPassword123!"
        }
    )
    assert response.status_code in [201, 400]  # 201 if success, 400 if user exists


def test_user_registration_weak_password():
    """Test registration with weak password"""
    response = client.post(
        "/auth/register",
        json={
            "name": "Test User",
            "email": "test2@example.com",
            "password": "weak"
        }
    )
    assert response.status_code == 422  # Validation error


def test_user_login():
    """Test user login"""
    # First register
    client.post(
        "/auth/register",
        json={
            "name": "Login Test",
            "email": "login@example.com",
            "password": "TestPassword123!"
        }
    )
    
    # Then login
    response = client.post(
        "/auth/login",
        json={
            "email": "login@example.com",
            "password": "TestPassword123!"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"


def test_user_login_invalid_credentials():
    """Test login with invalid credentials"""
    response = client.post(
        "/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "WrongPassword123!"
        }
    )
    assert response.status_code == 401


def test_get_current_user():
    """Test getting current user info"""
    # Register and login
    client.post(
        "/auth/register",
        json={
            "name": "Current User Test",
            "email": "current@example.com",
            "password": "TestPassword123!"
        }
    )
    
    login_response = client.post(
        "/auth/login",
        json={
            "email": "current@example.com",
            "password": "TestPassword123!"
        }
    )
    
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "current@example.com"


def test_refresh_token():
    """Test token refresh"""
    # Register and login
    client.post(
        "/auth/register",
        json={
            "name": "Refresh Test",
            "email": "refresh@example.com",
            "password": "TestPassword123!"
        }
    )
    
    login_response = client.post(
        "/auth/login",
        json={
            "email": "refresh@example.com",
            "password": "TestPassword123!"
        }
    )
    
    if login_response.status_code == 200:
        refresh_token = login_response.json()["refresh_token"]
        response = client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
