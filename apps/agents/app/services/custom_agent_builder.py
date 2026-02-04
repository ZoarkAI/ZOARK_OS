import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from uuid import uuid4
from app.db import get_conn

logger = logging.getLogger(__name__)


class CustomAgentBuilder:
    """Build and manage custom agents using CrewAI and LangChain"""
    
    def __init__(self):
        self.agents = {}
        self.tasks = {}
    
    async def create_agent(self, user_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a custom agent from configuration
        
        Config structure:
        {
            "name": "Agent Name",
            "description": "What the agent does",
            "role": "Agent role",
            "goal": "Agent goal",
            "backstory": "Agent backstory",
            "llmProvider": "openai|anthropic|huggingface|custom",
            "apiKeyId": "api_key_id",
            "tools": ["tool1", "tool2"],
            "tasks": [
                {
                    "description": "Task description",
                    "expectedOutput": "Expected output",
                    "tools": ["tool1"]
                }
            ]
        }
        """
        try:
            agent_id = str(uuid4())
            
            async with get_conn() as conn:
                # Store agent configuration
                agent = await conn.fetchrow(
                    '''INSERT INTO "CustomAgent" 
                       ("id", "userId", "name", "description", "role", "goal", "backstory", 
                        "llmProvider", "apiKeyId", "tools", "config", "isActive", "createdAt", "updatedAt")
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), NOW())
                       RETURNING *''',
                    agent_id, user_id, config.get("name"), config.get("description"),
                    config.get("role"), config.get("goal"), config.get("backstory"),
                    config.get("llmProvider"), config.get("apiKeyId"),
                    json.dumps(config.get("tools", [])), json.dumps(config)
                )
            
            logger.info(f"Created custom agent {agent_id} for user {user_id}")
            return self._format_agent_response(agent)
        
        except Exception as e:
            logger.error(f"Error creating custom agent: {e}")
            raise
    
    async def execute_agent(self, user_id: str, agent_id: str, task_input: str) -> Dict[str, Any]:
        """Execute a custom agent with given input"""
        try:
            async with get_conn() as conn:
                # Get agent configuration
                agent = await conn.fetchrow(
                    'SELECT * FROM "CustomAgent" WHERE "id" = $1 AND "userId" = $2',
                    agent_id, user_id
                )
                
                if not agent:
                    raise Exception("Agent not found")
                
                if not agent["isActive"]:
                    raise Exception("Agent is inactive")
                
                # Get API key
                api_key = await conn.fetchrow(
                    'SELECT * FROM "APIKey" WHERE "id" = $1 AND "userId" = $2',
                    agent["apiKeyId"], user_id
                )
                
                if not api_key or not api_key["isActive"]:
                    raise Exception("API key not found or inactive")
            
            # Execute agent using CrewAI/LangChain
            execution_id = str(uuid4())
            result = await self._execute_with_crew_ai(
                agent, api_key, task_input, execution_id
            )
            
            # Store execution result
            async with get_conn() as conn:
                await conn.execute(
                    '''INSERT INTO "AgentExecution" 
                       ("id", "agentId", "userId", "input", "output", "status", "tokensUsed", "costEstimate", "executedAt", "createdAt")
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())''',
                    execution_id, agent_id, user_id, task_input, result.get("output"),
                    result.get("status"), result.get("tokensUsed", 0), result.get("cost", 0.0)
                )
            
            return {
                "executionId": execution_id,
                "agentId": agent_id,
                "status": result.get("status"),
                "output": result.get("output"),
                "tokensUsed": result.get("tokensUsed", 0),
                "cost": result.get("cost", 0.0),
                "executedAt": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Error executing agent: {e}")
            raise
    
    async def _execute_with_crew_ai(self, agent: Dict, api_key: Dict, task_input: str, execution_id: str) -> Dict[str, Any]:
        """Execute agent using CrewAI framework"""
        try:
            # Import CrewAI and LangChain
            from crewai import Agent, Task, Crew
            from langchain_openai import ChatOpenAI
            from langchain_anthropic import ChatAnthropic
            
            # Decrypt API key
            from cryptography.fernet import Fernet
            import os
            ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key())
            cipher_suite = Fernet(ENCRYPTION_KEY)
            decrypted_key = cipher_suite.decrypt(api_key["encryptedKey"].encode()).decode()
            
            # Initialize LLM based on provider
            if agent["llmProvider"] == "openai":
                llm = ChatOpenAI(api_key=decrypted_key, model="gpt-4")
            elif agent["llmProvider"] == "anthropic":
                llm = ChatAnthropic(api_key=decrypted_key, model="claude-3-sonnet-20240229")
            elif agent["llmProvider"] == "custom":
                # Use custom endpoint
                from langchain_openai import ChatOpenAI
                llm = ChatOpenAI(
                    api_key=decrypted_key,
                    base_url=api_key["endpoint"],
                    model="custom"
                )
            else:
                raise Exception(f"Unsupported LLM provider: {agent['llmProvider']}")
            
            # Create CrewAI agent
            config = json.loads(agent["config"])
            crew_agent = Agent(
                role=agent["role"],
                goal=agent["goal"],
                backstory=agent["backstory"],
                llm=llm,
                tools=self._get_tools(config.get("tools", []))
            )
            
            # Create task
            task = Task(
                description=task_input,
                agent=crew_agent,
                expected_output=config.get("expectedOutput", "Detailed output")
            )
            
            # Create and execute crew
            crew = Crew(agents=[crew_agent], tasks=[task], verbose=True)
            result = crew.kickoff()
            
            return {
                "status": "success",
                "output": str(result),
                "tokensUsed": 0,  # Track from LLM
                "cost": 0.0  # Calculate based on tokens
            }
        
        except Exception as e:
            logger.error(f"Error in CrewAI execution: {e}")
            return {
                "status": "error",
                "output": str(e),
                "tokensUsed": 0,
                "cost": 0.0
            }
    
    def _get_tools(self, tool_names: List[str]) -> List[Any]:
        """Get tools for agent"""
        from langchain_community.tools import DuckDuckGoSearchRun, WikipediaQueryRun
        from langchain_community.tools.file_management import ReadFileTool, WriteFileTool
        
        tools_map = {
            "search": DuckDuckGoSearchRun(),
            "wikipedia": WikipediaQueryRun(),
            "read_file": ReadFileTool(),
            "write_file": WriteFileTool(),
        }
        
        return [tools_map[name] for name in tool_names if name in tools_map]
    
    async def list_agents(self, user_id: str) -> List[Dict[str, Any]]:
        """List all agents for user"""
        async with get_conn() as conn:
            agents = await conn.fetch(
                'SELECT * FROM "CustomAgent" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
                user_id
            )
        
        return [self._format_agent_response(a) for a in agents]
    
    async def get_agent(self, user_id: str, agent_id: str) -> Dict[str, Any]:
        """Get agent details"""
        async with get_conn() as conn:
            agent = await conn.fetchrow(
                'SELECT * FROM "CustomAgent" WHERE "id" = $1 AND "userId" = $2',
                agent_id, user_id
            )
        
        if not agent:
            raise Exception("Agent not found")
        
        return self._format_agent_response(agent)
    
    async def update_agent(self, user_id: str, agent_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Update agent configuration"""
        async with get_conn() as conn:
            agent = await conn.fetchrow(
                '''UPDATE "CustomAgent" 
                   SET "name" = $1, "description" = $2, "role" = $3, "goal" = $4, 
                       "backstory" = $5, "llmProvider" = $6, "apiKeyId" = $7, 
                       "tools" = $8, "config" = $9, "updatedAt" = NOW()
                   WHERE "id" = $10 AND "userId" = $11
                   RETURNING *''',
                config.get("name"), config.get("description"), config.get("role"),
                config.get("goal"), config.get("backstory"), config.get("llmProvider"),
                config.get("apiKeyId"), json.dumps(config.get("tools", [])),
                json.dumps(config), agent_id, user_id
            )
        
        if not agent:
            raise Exception("Agent not found")
        
        return self._format_agent_response(agent)
    
    async def delete_agent(self, user_id: str, agent_id: str) -> bool:
        """Delete agent"""
        async with get_conn() as conn:
            result = await conn.execute(
                'DELETE FROM "CustomAgent" WHERE "id" = $1 AND "userId" = $2',
                agent_id, user_id
            )
        
        return result != "DELETE 0"
    
    def _format_agent_response(self, agent) -> Dict[str, Any]:
        """Format agent database row to response"""
        return {
            "id": agent["id"],
            "name": agent["name"],
            "description": agent["description"],
            "role": agent["role"],
            "goal": agent["goal"],
            "backstory": agent["backstory"],
            "llmProvider": agent["llmProvider"],
            "apiKeyId": agent["apiKeyId"],
            "tools": json.loads(agent["tools"]),
            "isActive": agent["isActive"],
            "createdAt": agent["createdAt"],
            "updatedAt": agent["updatedAt"]
        }
