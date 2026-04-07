import json
import sys
from sentence_transformers import SentenceTransformer

if len(sys.argv) < 2:
    print(json.dumps([]))
    sys.exit(0)

query = sys.argv[1]

model = SentenceTransformer("all-MiniLM-L6-v2")

embedding = model.encode([query], normalize_embeddings=True)[0].tolist()

print(json.dumps(embedding))