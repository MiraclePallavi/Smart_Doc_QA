from pydantic import BaseModel

class EmbeddingRequest(BaseModel):
    texts: list[str]

class ChunkResponse(BaseModel):
    document_id: int
    chunk_count: int

class AskRequest(BaseModel):
    question: str
    document_id: int
    top_k: int = 3

class RetrievedChunk(BaseModel):
    text: str
    chunk_type: str
    score: float

class AskResponse(BaseModel):
    answer: str
    sources: list[RetrievedChunk]