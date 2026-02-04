import asyncio
import logging
from datetime import datetime, timedelta
from app.db import get_conn

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """Orchestrates multiple agents with event-driven triggers and scheduling"""
    
    def __init__(self):
        self.agents = {}
        self.running = False
        
        # Try to load agents, but don't fail if they're not available
        try:
            from app.agents.broadcast_agent import BroadcastAgent
            self.agents['broadcast_agent'] = BroadcastAgent()
        except Exception as e:
            logger.warning(f"Could not load BroadcastAgent: {e}")
        
        try:
            from app.agents.document_indexer import DocumentIndexerAgent
            self.agents['document_indexer'] = DocumentIndexerAgent()
        except Exception as e:
            logger.warning(f"Could not load DocumentIndexerAgent: {e}")
        
        try:
            from app.agents.task_escalator import TaskEscalatorAgent
            self.agents['task_escalator'] = TaskEscalatorAgent()
        except Exception as e:
            logger.warning(f"Could not load TaskEscalatorAgent: {e}")
        
        try:
            from app.agents.team_coordinator import TeamCoordinatorAgent
            self.agents['team_coordinator'] = TeamCoordinatorAgent()
        except Exception as e:
            logger.warning(f"Could not load TeamCoordinatorAgent: {e}")
    
    async def start(self):
        """Start the orchestrator"""
        self.running = True
        logger.info("Agent Orchestrator started")
        
        # Run scheduled agents
        asyncio.create_task(self._run_scheduled_agents())
        
        # Monitor for event-driven triggers
        asyncio.create_task(self._monitor_event_triggers())
    
    async def stop(self):
        """Stop the orchestrator"""
        self.running = False
        logger.info("Agent Orchestrator stopped")
    
    async def _run_scheduled_agents(self):
        """Run agents on schedule"""
        while self.running:
            try:
                async with get_conn() as conn:
                    # Get all active schedules
                    schedules = await conn.fetch(
                        '''SELECT * FROM "AgentSchedule" 
                           WHERE "isActive" = true
                           AND ("nextRun" IS NULL OR "nextRun" <= NOW())'''
                    )
                    
                    for schedule in schedules:
                        agent_type = schedule['agentType']
                        if agent_type in self.agents:
                            await self._execute_agent(agent_type, schedule)
                
                # Check every 30 seconds
                await asyncio.sleep(30)
            except Exception as e:
                logger.error(f"Error in scheduled agent execution: {e}")
                await asyncio.sleep(30)
    
    async def _monitor_event_triggers(self):
        """Monitor for event-driven agent triggers"""
        while self.running:
            try:
                await self._check_task_events()
                await self._check_approval_events()
                await self._check_broadcast_events()
                
                # Check every 10 seconds
                await asyncio.sleep(10)
            except Exception as e:
                logger.error(f"Error in event monitoring: {e}")
                await asyncio.sleep(10)
    
    async def _check_task_events(self):
        """Check for task-related events"""
        async with get_conn() as conn:
            # Check for stuck tasks
            stuck_threshold = datetime.utcnow() - timedelta(hours=48)
            stuck_tasks = await conn.fetch(
                '''SELECT COUNT(*) as count FROM "Task" 
                   WHERE "status" = 'ACTIVE'::\"TaskStatus\"
                   AND "lastUpdated" < $1
                   AND "healthStatus" != 'CRITICAL'::\"HealthStatus\"''',
                stuck_threshold
            )
            
            if stuck_tasks[0]['count'] > 0:
                logger.info(f"Triggering task_escalator for {stuck_tasks[0]['count']} stuck tasks")
                await self._execute_agent('task_escalator', None)
    
    async def _check_approval_events(self):
        """Check for approval-related events"""
        async with get_conn() as conn:
            # Check for overdue approvals
            overdue_approvals = await conn.fetch(
                '''SELECT COUNT(*) as count FROM "ApprovalStep" 
                   WHERE "status" = 'PENDING'::\"ApprovalStatus\"
                   AND "deadline" < NOW()
                   AND ("lastNudgedAt" IS NULL OR "lastNudgedAt" < NOW() - INTERVAL '24 hours')'''
            )
            
            if overdue_approvals[0]['count'] > 0:
                logger.info(f"Triggering approval_nudger for {overdue_approvals[0]['count']} overdue approvals")
                await self._execute_agent('approval_nudger', None)
    
    async def _check_broadcast_events(self):
        """Check for broadcast-related events"""
        async with get_conn() as conn:
            # Check for scheduled broadcasts
            scheduled_broadcasts = await conn.fetch(
                '''SELECT COUNT(*) as count FROM "BroadcastEmail" 
                   WHERE "status" = 'SCHEDULED'::\"BroadcastStatus\"
                   AND "scheduledFor" <= NOW()'''
            )
            
            if scheduled_broadcasts[0]['count'] > 0:
                logger.info(f"Triggering broadcast_agent for {scheduled_broadcasts[0]['count']} scheduled broadcasts")
                await self._execute_agent('broadcast_agent', None)
    
    async def _execute_agent(self, agent_type: str, schedule: dict = None):
        """Execute a single agent"""
        try:
            agent = self.agents.get(agent_type)
            if not agent:
                logger.warning(f"Agent {agent_type} not found")
                return
            
            logger.info(f"Executing agent: {agent_type}")
            await agent.run()
            
            # Update schedule if provided
            if schedule:
                await self._update_schedule(schedule['id'])
        except Exception as e:
            logger.error(f"Error executing agent {agent_type}: {e}")
    
    async def _update_schedule(self, schedule_id: str):
        """Update schedule after execution"""
        try:
            async with get_conn() as conn:
                # Calculate next run based on cron expression
                # For now, just update lastRun
                await conn.execute(
                    '''UPDATE "AgentSchedule" 
                       SET "lastRun" = NOW(), "updatedAt" = NOW()
                       WHERE "id" = $1''',
                    schedule_id
                )
        except Exception as e:
            logger.error(f"Error updating schedule {schedule_id}: {e}")


# Global orchestrator instance
_orchestrator = None


async def get_orchestrator() -> AgentOrchestrator:
    """Get or create the global orchestrator"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = AgentOrchestrator()
    return _orchestrator


async def start_orchestrator():
    """Start the global orchestrator"""
    orchestrator = await get_orchestrator()
    await orchestrator.start()


async def stop_orchestrator():
    """Stop the global orchestrator"""
    global _orchestrator
    if _orchestrator:
        await _orchestrator.stop()
        _orchestrator = None
