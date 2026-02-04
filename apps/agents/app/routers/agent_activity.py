import json
from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.db import get_conn

router = APIRouter(prefix="/agent-activity", tags=["agents"])


class AgentActivityResponse(BaseModel):
    id: str
    action: str
    status: str
    timestamp: datetime
    context: dict


def row_to_agent_activity(row) -> dict:
    return {
        "id": row["id"],
        "action": row["action"],
        "status": row["status"],
        "timestamp": row["timestamp"],
        "context": json.loads(row["context"]) if isinstance(row["context"], str) else (row["context"] or {}),
    }


@router.get("/", response_model=List[AgentActivityResponse])
async def list_agent_activity(
    action: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50),
):
    """Get recent agent activity logs"""
    async with get_conn() as conn:
        query = 'SELECT * FROM "AgentLog"'
        conditions = []
        params = []
        idx = 1
        
        if action:
            conditions.append(f'"action" = ${idx}::\"AgentAction\"')
            params.append(action)
            idx += 1
        if status:
            conditions.append(f'"status" = ${idx}::\"AgentStatus\"')
            params.append(status)
            idx += 1
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += f' ORDER BY "timestamp" DESC LIMIT ${idx}'
        params.append(limit)
        
        rows = await conn.fetch(query, *params)
    return [row_to_agent_activity(r) for r in rows]


@router.get("/{log_id}", response_model=AgentActivityResponse)
async def get_agent_activity(log_id: str):
    """Get a specific agent activity log"""
    async with get_conn() as conn:
        row = await conn.fetchrow('SELECT * FROM "AgentLog" WHERE "id" = $1', log_id)
    if not row:
        raise HTTPException(status_code=404, detail="Activity log not found")
    return row_to_agent_activity(row)


@router.websocket("/ws")
async def websocket_agent_activity(websocket: WebSocket):
    """WebSocket endpoint for real-time agent activity updates"""
    await websocket.accept()
    
    try:
        while True:
            # Receive filter preferences from client
            data = await websocket.receive_json()
            action_filter = data.get("action")
            status_filter = data.get("status")
            
            # Get recent activity
            async with get_conn() as conn:
                query = 'SELECT * FROM "AgentLog"'
                conditions = []
                params = []
                idx = 1
                
                if action_filter:
                    conditions.append(f'"action" = ${idx}::\"AgentAction\"')
                    params.append(action_filter)
                    idx += 1
                if status_filter:
                    conditions.append(f'"status" = ${idx}::\"AgentStatus\"')
                    params.append(status_filter)
                    idx += 1
                
                if conditions:
                    query += " WHERE " + " AND ".join(conditions)
                query += f' ORDER BY "timestamp" DESC LIMIT 20'
                
                rows = await conn.fetch(query, *params)
            
            # Send activity logs to client
            activities = [row_to_agent_activity(r) for r in rows]
            await websocket.send_json({
                "type": "activity_update",
                "activities": activities,
                "timestamp": datetime.utcnow().isoformat(),
            })
    
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": str(e),
        })
        await websocket.close()


@router.get("/stats/summary")
async def get_agent_stats_summary():
    """Get summary statistics of agent activity"""
    async with get_conn() as conn:
        # Get activity by action type
        by_action = await conn.fetch(
            '''SELECT "action", COUNT(*) as count, 
                      SUM(CASE WHEN "status" = 'SUCCESS'::\"AgentStatus\" THEN 1 ELSE 0 END) as success_count
               FROM "AgentLog"
               WHERE "timestamp" > NOW() - INTERVAL '24 hours'
               GROUP BY "action"'''
        )
        
        # Get activity by status
        by_status = await conn.fetch(
            '''SELECT "status", COUNT(*) as count
               FROM "AgentLog"
               WHERE "timestamp" > NOW() - INTERVAL '24 hours'
               GROUP BY "status"'''
        )
        
        # Get total activity
        total = await conn.fetchval(
            '''SELECT COUNT(*) FROM "AgentLog"
               WHERE "timestamp" > NOW() - INTERVAL '24 hours' '''
        )
    
    return {
        "total_activities": total or 0,
        "by_action": [
            {
                "action": row["action"],
                "count": row["count"],
                "success_count": row["success_count"] or 0,
            }
            for row in by_action
        ],
        "by_status": [
            {
                "status": row["status"],
                "count": row["count"],
            }
            for row in by_status
        ],
        "period": "last_24_hours",
    }
