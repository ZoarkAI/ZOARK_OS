import logging
from app.db import get_conn
from app.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)


class DocumentIndexerAgent(BaseAgent):
    """Agent that indexes documents to RAG system"""

    agent_type = "document_indexer"

    def get_action_type(self) -> str:
        return "DOCUMENT_INDEXED"

    async def run(self):
        """Check for pending documents and index them to RAG"""
        async with get_conn() as conn:
            documents = await conn.fetch(
                '''SELECT * FROM "RAGDocument"
                   WHERE "ragStatus" = 'PENDING'::"RAGStatus"
                   ORDER BY "createdAt" ASC
                   LIMIT 10'''
            )

            for doc in documents:
                await self._index_document(conn, doc)

        return {"documents_processed": len(documents)}

    async def _index_document(self, conn, document):
        """Index a single document to RAG"""
        try:
            content = document["content"]
            if not content and document["url"]:
                # In production, would fetch and extract text from URL
                content = f"Document: {document['name']}"

            # In production, would call Pinecone API to create embeddings and store vector
            logger.info(f"Indexing document {document['id']}: {document['name']}")

            await conn.execute(
                '''UPDATE "RAGDocument"
                   SET "ragStatus" = 'INDEXED'::"RAGStatus", "updatedAt" = NOW()
                   WHERE "id" = $1''',
                document["id"]
            )

        except Exception as e:
            logger.error(f"Error indexing document {document['id']}: {e}")
            async with get_conn() as err_conn:
                await err_conn.execute(
                    '''UPDATE "RAGDocument"
                       SET "ragStatus" = 'FAILED'::"RAGStatus", "updatedAt" = NOW()
                       WHERE "id" = $1''',
                    document["id"]
                )
