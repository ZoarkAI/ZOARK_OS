import pytest
import asyncio
from datetime import datetime, timedelta
from app.agents.broadcast_agent import BroadcastAgent
from app.agents.document_indexer import DocumentIndexerAgent
from app.agents.task_escalator import TaskEscalatorAgent
from app.agents.team_coordinator import TeamCoordinatorAgent


@pytest.mark.asyncio
async def test_broadcast_agent_initialization():
    """Test broadcast agent can be initialized"""
    agent = BroadcastAgent()
    assert agent.agent_type == "broadcast_agent"


@pytest.mark.asyncio
async def test_document_indexer_initialization():
    """Test document indexer agent can be initialized"""
    agent = DocumentIndexerAgent()
    assert agent.agent_type == "document_indexer"


@pytest.mark.asyncio
async def test_task_escalator_initialization():
    """Test task escalator agent can be initialized"""
    agent = TaskEscalatorAgent()
    assert agent.agent_type == "task_escalator"


@pytest.mark.asyncio
async def test_team_coordinator_initialization():
    """Test team coordinator agent can be initialized"""
    agent = TeamCoordinatorAgent()
    assert agent.agent_type == "team_coordinator"


@pytest.mark.asyncio
async def test_agent_logging():
    """Test agents can log actions"""
    agent = BroadcastAgent()
    # This would test the log_action method
    # In a real test, we'd mock the database
    assert hasattr(agent, 'log_action')
