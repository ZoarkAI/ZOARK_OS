import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "ZOARK OS API" in response.json()["message"]


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code in [200, 503]
    assert "status" in response.json()


def test_team_members_list():
    """Test listing team members"""
    response = client.get("/team-members")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_email_accounts_list():
    """Test listing email accounts"""
    response = client.get("/email-accounts")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_pipeline_templates_list():
    """Test listing pipeline templates"""
    response = client.get("/pipeline-templates")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_rag_documents_list():
    """Test listing RAG documents"""
    response = client.get("/documents")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_agent_schedules_list():
    """Test listing agent schedules"""
    response = client.get("/agents/schedule")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_agent_activity_list():
    """Test listing agent activity"""
    response = client.get("/agent-activity")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_agent_stats_summary():
    """Test agent statistics summary"""
    response = client.get("/agent-activity/stats/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_activities" in data
    assert "by_action" in data
    assert "by_status" in data
