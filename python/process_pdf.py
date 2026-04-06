import fitz
import sys
import json

def main():
    if len(sys.argv) < 3:
        raise SystemExit("Usage: process_pdf.py <pdf_path> <chunks_output_path>")

    pdf_path = sys.argv[1]
    chunks_output_path = sys.argv[2]

    doc = fitz.open(pdf_path)

    text_parts = []
    for page in doc:
        text_parts.append(str(page.get_text()))

    text = " ".join(text_parts)

    chunks = []
    chunk_size = 800
    overlap = 100

    start = 0
    while start < len(text):
        chunk = text[start:start + chunk_size].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap

    if not chunks:
        chunks = ["No readable text found in PDF"]

    with open(chunks_output_path, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False)

if __name__ == "__main__":
    main()