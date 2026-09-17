from db.models import Document, Chunk

from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.orm import Session
from schemas.query import EmbeddingRequest, ChunkResponse
from services.embeddings import embed_texts
from services.process_pdf import process_pdf_bytes
from db.database import get_db
from services.embeddings import embed_texts
from schemas.query import AskRequest, AskResponse, RetrievedChunk
from services.embeddings import cosine_similarity
from services.llm import generate_answer
router = APIRouter()

@router.post("/embed")
def embed(request: EmbeddingRequest):
    embeddings = embed_texts(request.texts)
    data = [{"text": t, "embedding": e} for t, e in zip(request.texts, embeddings)]
    return {"data": data}




@router.post("/chunk", response_model=ChunkResponse)
async def process_pdf(file: UploadFile, db: Session = Depends(get_db)):
    contents = await file.read()
    chunk_dict = process_pdf_bytes(contents)

    document = Document(filename=file.filename)
    db.add(document)
    db.commit()
    db.refresh(document)

    # Step 1: flatten both QA and Summary into one list, keeping track of type + index
    all_chunks_meta = []
    for index, text in enumerate(chunk_dict.get("QA", [])):
        all_chunks_meta.append(("QA", index, text))
    for index, text in enumerate(chunk_dict.get("Summary", [])):
        all_chunks_meta.append(("Summary", index, text))

    all_texts = [text for (_, _, text) in all_chunks_meta]
    embeddings = embed_texts(all_texts)

    chunk_count = 0
    for (chunk_type, index, text), embedding in zip(all_chunks_meta, embeddings):
        chunk = Chunk(
        document_id=document.id,
        chunk_type=chunk_type,
        chunk_index=index,
        text=text,
        embedding=embedding
    )
        db.add(chunk)
        chunk_count += 1

    db.commit()
    return {"document_id": document.id, "chunk_count": chunk_count}


@router.post("/ask", response_model=AskResponse)
def ask(request: AskRequest, db: Session = Depends(get_db)):
    chunks = db.query(Chunk).filter(Chunk.document_id == request.document_id).all()
    query_embedding = embed_texts([request.question])[0]

    scored = [(c, cosine_similarity(query_embedding, c.embedding)) for c in chunks]
    scored.sort(key=lambda x: x[1], reverse=True)
    top_chunks = scored[:request.top_k]

    answer = generate_answer(request.question, [c.text for c, score in top_chunks])

    sources = [
        RetrievedChunk(text=c.text, chunk_type=c.chunk_type, score=score)
        for c, score in top_chunks
    ]
    return AskResponse(answer=answer, sources=sources)