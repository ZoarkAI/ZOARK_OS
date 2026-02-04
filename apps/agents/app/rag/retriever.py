"""
RAG Retriever

Semantic search over documents using embeddings + Pinecone.
"""

from typing import List, Dict, Any
import logging
from app.rag.embeddings import get_embeddings_service
from app.rag.pinecone_client import get_pinecone_client

logger = logging.getLogger(__name__)


class RAGRetriever:
    """
    Retrieval-Augmented Generation retriever.

    Performs semantic search over indexed documents.
    """

    def __init__(self):
        self.embeddings_service = get_embeddings_service()
        self.pinecone_client = get_pinecone_client()

    async def semantic_search(
        self,
        query: str,
        top_k: int = 5,
        filter_dict: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search on documents.

        Args:
            query: Search query text
            top_k: Number of results to return
            filter_dict: Metadata filter (e.g., {"type": "invoice"})

        Returns:
            List of search results with scores and metadata
        """
        logger.info(f"Semantic search: '{query}' (top_k={top_k})")

        # Generate query embedding
        query_embedding = await self.embeddings_service.generate_embedding(query)

        # Search Pinecone
        results = await self.pinecone_client.query(
            query_embedding=query_embedding,
            top_k=top_k,
            filter_dict=filter_dict
        )

        # Format results
        formatted_results = [
            {
                'score': result['score'],
                'text': result['metadata'].get('text', ''),
                'metadata': {
                    k: v for k, v in result['metadata'].items() if k != 'text'
                }
            }
            for result in results
        ]

        logger.info(f"Found {len(formatted_results)} results")
        return formatted_results

    async def index_document(
        self,
        doc_id: str,
        text: str,
        metadata: Dict[str, Any]
    ) -> None:
        """
        Index a document for semantic search.

        Args:
            doc_id: Unique document identifier
            text: Document text content
            metadata: Additional metadata
        """
        logger.info(f"Indexing document: {doc_id}")

        # Generate embedding
        embedding = await self.embeddings_service.generate_embedding(text)

        # Store in Pinecone
        metadata_with_text = {**metadata, 'text': text}
        await self.pinecone_client.upsert_document(
            doc_id=doc_id,
            embedding=embedding,
            metadata=metadata_with_text
        )

        logger.info(f"Document {doc_id} indexed successfully")

    async def index_batch(
        self,
        documents: List[Dict[str, Any]]
    ) -> None:
        """
        Index multiple documents.

        Args:
            documents: List of documents with 'id', 'text', and 'metadata'
        """
        logger.info(f"Batch indexing {len(documents)} documents")

        for doc in documents:
            await self.index_document(
                doc_id=doc['id'],
                text=doc['text'],
                metadata=doc.get('metadata', {})
            )

        logger.info("Batch indexing complete")


# Singleton instance
_rag_retriever = None


def get_rag_retriever() -> RAGRetriever:
    """
    Get singleton RAG retriever instance.

    Returns:
        RAGRetriever instance
    """
    global _rag_retriever
    if _rag_retriever is None:
        _rag_retriever = RAGRetriever()
    return _rag_retriever
