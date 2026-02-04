"""
Embeddings Service

Generates vector embeddings using OpenAI's embedding models.
Falls back to random mock vectors when OPENAI_API_KEY is not set.
"""

from typing import List
import logging
import random

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_openai_client = None


def _get_openai_client():
    global _openai_client
    if _openai_client is None and settings.openai_api_key:
        from openai import AsyncOpenAI
        _openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai_client


class EmbeddingsService:
    def __init__(self):
        self.model = "text-embedding-3-small"
        if _get_openai_client():
            logger.info("Embeddings service initialized (OpenAI)")
        else:
            logger.info("Embeddings service initialized (mock — set OPENAI_API_KEY to enable)")

    async def generate_embedding(self, text: str) -> List[float]:
        client = _get_openai_client()
        if client:
            response = await client.embeddings.create(model=self.model, input=text)
            return response.data[0].embedding

        logger.warning("Using MOCK embeddings — set OPENAI_API_KEY for real vectors")
        return [random.random() for _ in range(1536)]

    async def generate_batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        client = _get_openai_client()
        if client:
            response = await client.embeddings.create(model=self.model, input=texts)
            return [d.embedding for d in response.data]

        logger.warning(f"Using MOCK batch embeddings for {len(texts)} texts — set OPENAI_API_KEY for real vectors")
        return [await self.generate_embedding(t) for t in texts]


# Singleton instance
_embeddings_service = None


def get_embeddings_service() -> EmbeddingsService:
    """
    Get singleton embeddings service instance.

    Returns:
        EmbeddingsService instance
    """
    global _embeddings_service
    if _embeddings_service is None:
        _embeddings_service = EmbeddingsService()
    return _embeddings_service
