import json
import sys
from sentence_transformers import SentenceTransformer

def main():
    if len(sys.argv) < 3:
        print("Usage: embed.py <chunks_input_path> <embeddings_output_path>")
        sys.exit(1)

    chunks_path = sys.argv[1]
    embeddings_path = sys.argv[2]

    # read chunks
    with open(chunks_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    if isinstance(chunks, str):
        chunks = [chunks]

    # load model
    model = SentenceTransformer("all-MiniLM-L6-v2")

    # generate embeddings
    embeddings = model.encode(chunks, normalize_embeddings=True).tolist()

    # save embeddings
    with open(embeddings_path, "w", encoding="utf-8") as f:
        json.dump(embeddings, f)

if __name__ == "__main__":
    main()