from fastapi import FastAPI
from contextlib import asynccontextmanager

from db import database
from db.database import Base
from db import models  
from services.embeddings import load_model
from routers import query

Base.metadata.create_all(bind=database.engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("loading model...")
    load_model()
    print("model loaded")
    yield
    print("shutting down model...")

app = FastAPI(lifespan=lifespan)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(query.router)