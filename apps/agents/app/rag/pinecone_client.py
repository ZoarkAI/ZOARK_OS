"""
Pinecone Vector Database Client

Handles document indexing and vector search for RAG.
Falls back to in-memory mock store when PINECONE_API_KEY is not set.
"""

from typing import Dict, Any, List
import logging

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_pinecone_index = None
# In-memory fallback store: {doc_id: {"embedding": [...], "metadata": {...}}}
_mock_store: Dict[str, Dict[str, Any]] = {}


def _get_index():
    global _pinecone_index
    if _pinecone_index is None and settings.pinecone_api_key:
        from pinecone import Pinecone
        pc = Pinecone(api_key=settings.pinecone_api_key)
        _pinecone_index = pc.Index(settings.pinecone_index_name)
    return _pinecone_index


class PineconeClient:
    def __init__(self):
        if _get_index():
            logger.info("Pinecone client initialized (live)")
        else:
            logger.info("Pinecone client initialized (mock — set PINECONE_API_KEY to enable)")

    async def upsert_document(self, doc_id: str, embedding: List[float], metadata: Dict[str, Any]) -> None:
        index = _get_index()
        if index:
            index.upsert(vectors=[{"id": doc_id, "values": embedding, "metadata": metadata}])
            logger.info(f"Upserted {doc_id} to Pinecone")
        else:
            _mock_store[doc_id] = {"embedding": embedding, "metadata": metadata}
            logger.debug(f"Upserted {doc_id} to mock store ({len(_mock_store)} docs)")

    async def query(self, query_embedding: List[float], top_k: int = 5, filter_dict: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        index = _get_index()
        if index:
            results = index.query(vector=query_embedding, top_k=top_k, filter=filter_dict, include_metadata=True)
            return [{"id": m.id, "score": m.score, "metadata": m.metadata} for m in results.matches]

        # Cosine-similarity fallback against mock store
        if not _mock_store:
            logger.warning(
                "RAG search returned MOCK data — no documents indexed and PINECONE_API_KEY is not set. "
                "Results below are placeholders, not real data."
            )
            return [
                {"id": "doc-1", "score": 0.95, "metadata": {"text": "Sample invoice document content...", "type": "invoice", "amount": 50000.00, "date": "2024-01-15", "_mock": True}},
                {"id": "doc-2", "score": 0.87, "metadata": {"text": "Contract agreement for project...", "type": "contract", "date": "2024-01-10", "_mock": True}},
            ]

        scored = []
        for doc_id, doc in _mock_store.items():
            if filter_dict:
                if not all(doc["metadata"].get(k) == v for k, v in filter_dict.items()):
                    continue
            score = _cosine_sim(query_embedding, doc["embedding"])
            scored.append({"id": doc_id, "score": score, "metadata": doc["metadata"]})

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    async def delete_document(self, doc_id: str) -> None:
        index = _get_index()
        if index:
            index.delete(ids=[doc_id])
        else:
            _mock_store.pop(doc_id, None)


def _cosine_sim(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = sum(x * x for x in a) ** 0.5
    mag_b = sum(x * x for x in b) ** 0.5
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


# Singleton instance
_pinecone_client = None


def get_pinecone_client() -> PineconeClient:
    """
    Get singleton Pinecone client instance.

    Returns:
        PineconeClient instance
    """
    global _pinecone_client
    if _pinecone_client is None:
        _pinecone_client = PineconeClient()
    return _pinecone_client
