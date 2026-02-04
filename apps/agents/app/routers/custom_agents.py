from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.routers.auth import get_current_user
from app.services.custom_agent_builder import CustomAgentBuilder

router = APIRouter(prefix="/custom-agents", tags=["custom-agents"])
agent_builder = CustomAgentBuilder()


class AgentToolConfig(BaseModel):
    name: str
    description: Optional[str] = None


class AgentTaskConfig(BaseModel):
    description: str
    expectedOutput: str
    tools: Optional[List[str]] = None


class CustomAgentCreate(BaseModel):
    name: str
    description: str
    role: str
    goal: str
    backstory: str
    llmProvider: str  # openai, anthropic, huggingface, custom
    apiKeyId: str
    tools: Optional[List[str]] = None
    tasks: Optional[List[AgentTaskConfig]] = None


class CustomAgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    role: Optional[str] = None
    goal: Optional[str] = None
    backstory: Optional[str] = None
    llmProvider: Optional[str] = None
    apiKeyId: Optional[str] = None
    tools: Optional[List[str]] = None


class CustomAgentResponse(BaseModel):
    id: str
    name: str
    description: str
    role: str
    goal: str
    backstory: str
    llmProvider: str
    apiKeyId: str
    tools: List[str]
    isActive: bool
    createdAt: datetime
    updatedAt: datetime


class AgentExecutionRequest(BaseModel):
    input: str


class AgentExecutionResponse(BaseModel):
    executionId: str
    agentId: str
    status: str
    output: str
    tokensUsed: int
    cost: float
    executedAt: str


@router.post("/", response_model=CustomAgentResponse, status_code=201)
async def create_custom_agent(
    agent_config: CustomAgentCreate,
    current_user = Depends(get_current_user)
):
    """Create a new custom agent"""
    try:
        config_dict = agent_config.dict()
        agent = await agent_builder.create_agent(current_user["id"], config_dict)
        return agent
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[CustomAgentResponse])
async def list_custom_agents(current_user = Depends(get_current_user)):
    """List all custom agents for current user"""
    try:
        agents = await agent_builder.list_agents(current_user["id"])
        return agents
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{agent_id}", response_model=CustomAgentResponse)
async def get_custom_agent(agent_id: str, current_user = Depends(get_current_user)):
    """Get custom agent details"""
    try:
        agent = await agent_builder.get_agent(current_user["id"], agent_id)
        return agent
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{agent_id}", response_model=CustomAgentResponse)
async def update_custom_agent(
    agent_id: str,
    agent_config: CustomAgentUpdate,
    current_user = Depends(get_current_user)
):
    """Update custom agent configuration"""
    try:
        # Get existing agent
        existing = await agent_builder.get_agent(current_user["id"], agent_id)
        
        # Merge updates
        config_dict = existing.copy()
        for key, value in agent_config.dict(exclude_unset=True).items():
            config_dict[key] = value
        
        agent = await agent_builder.update_agent(current_user["id"], agent_id, config_dict)
        return agent
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{agent_id}")
async def delete_custom_agent(agent_id: str, current_user = Depends(get_current_user)):
    """Delete custom agent"""
    try:
        success = await agent_builder.delete_agent(current_user["id"], agent_id)
        if not success:
            raise HTTPException(status_code=404, detail="Agent not found")
        return {"message": "Agent deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{agent_id}/execute", response_model=AgentExecutionResponse)
async def execute_custom_agent(
    agent_id: str,
    request: AgentExecutionRequest,
    current_user = Depends(get_current_user)
):
    """Execute custom agent with input"""
    try:
        result = await agent_builder.execute_agent(
            current_user["id"],
            agent_id,
            request.input
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{agent_id}/activate")
async def activate_agent(agent_id: str, current_user = Depends(get_current_user)):
    """Activate custom agent"""
    try:
        from app.db import get_conn
        async with get_conn() as conn:
            agent = await conn.fetchrow(
                'UPDATE "CustomAgent" SET "isActive" = true, "updatedAt" = NOW() WHERE "id" = $1 AND "userId" = $2 RETURNING *',
                agent_id, current_user["id"]
            )
        
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return {"message": "Agent activated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{agent_id}/deactivate")
async def deactivate_agent(agent_id: str, current_user = Depends(get_current_user)):
    """Deactivate custom agent"""
    try:
        from app.db import get_conn
        async with get_conn() as conn:
            agent = await conn.fetchrow(
                'UPDATE "CustomAgent" SET "isActive" = false, "updatedAt" = NOW() WHERE "id" = $1 AND "userId" = $2 RETURNING *',
                agent_id, current_user["id"]
            )
        
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return {"message": "Agent deactivated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{agent_id}/executions")
async def get_agent_executions(
    agent_id: str,
    limit: int = 50,
    current_user = Depends(get_current_user)
):
    """Get execution history for agent"""
    try:
        from app.db import get_conn
        async with get_conn() as conn:
            executions = await conn.fetch(
                '''SELECT * FROM "AgentExecution" 
                   WHERE "agentId" = $1 AND "userId" = $2 
                   ORDER BY "executedAt" DESC 
                   LIMIT $3''',
                agent_id, current_user["id"], limit
            )
        
        return [
            {
                "executionId": e["id"],
                "agentId": e["agentId"],
                "status": e["status"],
                "input": e["input"],
                "output": e["output"],
                "tokensUsed": e["tokensUsed"],
                "cost": e["costEstimate"],
                "executedAt": e["executedAt"].isoformat()
            }
            for e in executions
        ]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
