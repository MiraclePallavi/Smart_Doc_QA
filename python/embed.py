import json
import sys
from sentence_transformers import SentenceTransformer

def main():
    if len(sys.argv) < 3:
        raise SystemExit("Usage: embed.py <input_json_path> <output_json_path>")

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, str):
        data = [data]

    model = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = model.encode(data, normalize_embeddings=True).tolist()

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(embeddings, f)

if __name__ == "__main__":
    main()