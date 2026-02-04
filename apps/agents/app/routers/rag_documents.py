from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import uuid4
from app.db import get_conn

router = APIRouter(prefix="/documents", tags=["rag"])


class RAGDocumentCreate(BaseModel):
    name: str
    type: str
    source: Optional[str] = None
    url: str
    content: Optional[str] = None
    metadata: Optional[dict] = None


class RAGDocumentUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    ragStatus: Optional[str] = None


class RAGDocumentResponse(BaseModel):
    id: str
    name: str
    type: str
    source: Optional[str]
    url: str
    ragStatus: str
    createdAt: datetime
    updatedAt: datetime


class RAGSearchResult(BaseModel):
    id: str
    name: str
    type: str
    source: Optional[str]
    url: str
    relevance: float


def row_to_rag_document(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "type": row["type"],
        "source": row["source"],
        "url": row["url"],
        "ragStatus": row["ragStatus"],
        "createdAt": row["createdAt"],
        "updatedAt": row["updatedAt"],
    }


@router.get("/", response_model=List[RAGDocumentResponse])
async def list_rag_documents(
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
):
    async with get_conn() as conn:
        query = 'SELECT * FROM "RAGDocument"'
        conditions = []
        params = []
        idx = 1
        
        if status:
            conditions.append(f'"ragStatus" = ${idx}::\"RAGStatus\"')
            params.append(status)
            idx += 1
        if type:
            conditions.append(f'"type" = ${idx}')
            params.append(type)
            idx += 1
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += ' ORDER BY "createdAt" DESC'
        
        rows = await conn.fetch(query, *params)
    return [row_to_rag_document(r) for r in rows]


@router.get("/{doc_id}", response_model=RAGDocumentResponse)
async def get_rag_document(doc_id: str):
    async with get_conn() as conn:
        row = await conn.fetchrow('SELECT * FROM "RAGDocument" WHERE "id" = $1', doc_id)
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    return row_to_rag_document(row)


@router.post("/", response_model=RAGDocumentResponse, status_code=201)
async def create_rag_document(doc: RAGDocumentCreate):
    async with get_conn() as conn:
        row = await conn.fetchrow(
            '''INSERT INTO "RAGDocument" ("id", "name", "type", "source", "url", "content", "metadata", "ragStatus", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8::\"RAGStatus\", NOW(), NOW())
               RETURNING *''',
            str(uuid4()), doc.name, doc.type, doc.source, doc.url, doc.content, doc.metadata or {}, "PENDING",
        )
    return row_to_rag_document(row)


@router.patch("/{doc_id}", response_model=RAGDocumentResponse)
async def update_rag_document(doc_id: str, doc: RAGDocumentUpdate):
    async with get_conn() as conn:
        existing = await conn.fetchrow('SELECT * FROM "RAGDocument" WHERE "id" = $1', doc_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Document not found")

        sets = ['"updatedAt" = NOW()']
        params: list = []
        idx = 1
        
        if doc.name is not None:
            sets.append(f'"name" = ${idx}')
            params.append(doc.name)
            idx += 1
        if doc.content is not None:
            sets.append(f'"content" = ${idx}')
            params.append(doc.content)
            idx += 1
        if doc.ragStatus is not None:
            sets.append(f'"ragStatus" = ${idx}::\"RAGStatus\"')
            params.append(doc.ragStatus)
            idx += 1

        params.append(doc_id)
        query = f'UPDATE "RAGDocument" SET {", ".join(sets)} WHERE "id" = ${idx} RETURNING *'
        row = await conn.fetchrow(query, *params)
    return row_to_rag_document(row)


@router.delete("/{doc_id}", status_code=204)
async def delete_rag_document(doc_id: str):
    async with get_conn() as conn:
        result = await conn.execute('DELETE FROM "RAGDocument" WHERE "id" = $1', doc_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Document not found")


@router.post("/search", response_model=List[RAGSearchResult])
async def search_rag_documents(
    query: str = Query(...),
    limit: int = Query(10),
    type: Optional[str] = Query(None),
):
    """Search documents using semantic search (would integrate with Pinecone in production)"""
    async with get_conn() as conn:
        # For now, do simple text search in content and name
        sql_query = '''
            SELECT "id", "name", "type", "source", "url", 
                   CASE 
                       WHEN "name" ILIKE $1 THEN 0.9
                       WHEN "content" ILIKE $1 THEN 0.7
                       ELSE 0.5
                   END as relevance
            FROM "RAGDocument"
            WHERE "ragStatus" = 'INDEXED'
            AND ("name" ILIKE $1 OR "content" ILIKE $1)
        '''
        params = [f"%{query}%"]
        
        if type:
            sql_query += ' AND "type" = $2'
            params.append(type)
        
        sql_query += ' ORDER BY relevance DESC LIMIT $' + str(len(params) + 1)
        params.append(limit)
        
        rows = await conn.fetch(sql_query, *params)
    
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "type": r["type"],
            "source": r["source"],
            "url": r["url"],
            "relevance": float(r["relevance"]),
        }
        for r in rows
    ]


@router.post("/{doc_id}/index", status_code=200)
async def index_document_to_rag(doc_id: str):
    """Index a document to RAG (Pinecone in production)"""
    async with get_conn() as conn:
        doc = await conn.fetchrow('SELECT * FROM "RAGDocument" WHERE "id" = $1', doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Update status to INDEXED
        await conn.execute(
            'UPDATE "RAGDocument" SET "ragStatus" = $1::\"RAGStatus\", "updatedAt" = NOW() WHERE "id" = $2',
            "INDEXED", doc_id
        )
    
    return {"status": "indexed", "documentId": doc_id}
