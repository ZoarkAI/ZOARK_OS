import logging
from app.db import get_conn
from app.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)


class BroadcastAgent(BaseAgent):
    """Agent that sends scheduled broadcast emails"""

    agent_type = "broadcast_agent"

    def get_action_type(self) -> str:
        return "BROADCAST_SENT"

    async def run(self):
        """Check for scheduled broadcasts and send them"""
        async with get_conn() as conn:
            broadcasts = await conn.fetch(
                '''SELECT * FROM "BroadcastEmail"
                   WHERE "status" = 'SCHEDULED'::"BroadcastStatus"
                   AND "scheduledFor" <= NOW()
                   ORDER BY "scheduledFor" ASC'''
            )

            for broadcast in broadcasts:
                await self._send_broadcast(conn, broadcast)

        return {"broadcasts_processed": len(broadcasts)}

    async def _send_broadcast(self, conn, broadcast):
        """Send a single broadcast email"""
        try:
            account = await conn.fetchrow(
                'SELECT * FROM "EmailAccount" WHERE "id" = $1',
                broadcast["emailAccountId"]
            )

            if not account or not account["isConnected"]:
                raise Exception(f"Email account {broadcast['emailAccountId']} not connected")

            recipients = broadcast["recipients"] or []

            # In production, integrate with actual email provider (Gmail, Outlook, etc.)
            logger.info(f"Sending broadcast to {len(recipients)} recipients")

            # Update broadcast status to SENT
            await conn.execute(
                '''UPDATE "BroadcastEmail"
                   SET "status" = 'SENT'::"BroadcastStatus", "sentAt" = NOW(), "updatedAt" = NOW()
                   WHERE "id" = $1''',
                broadcast["id"]
            )

        except Exception as e:
            logger.error(f"Error sending broadcast {broadcast['id']}: {e}")
            async with get_conn() as err_conn:
                await err_conn.execute(
                    '''UPDATE "BroadcastEmail"
                       SET "status" = 'FAILED'::"BroadcastStatus", "updatedAt" = NOW()
                       WHERE "id" = $1''',
                    broadcast["id"]
                )
