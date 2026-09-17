from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, ARRAY, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base
class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String,nullable=False)
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer,  ForeignKey('documents.id'), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(String, nullable=False)
    embedding = Column(ARRAY(Float))
    document  = relationship("Document", back_populates="chunks")
    chunk_type = Column(String, nullable=False)  # e.g., "QA" or "Summary"
    created_at = Column(DateTime(timezone=True), server_default=func.now())