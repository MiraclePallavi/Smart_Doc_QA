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

    def chunk_by_word(word, chunk_size, overlap):
        chunks = []
        for i in range(0, len(word), chunk_size - overlap):
            chunk = " ".join(word[i:i + chunk_size]).strip()
            if chunk:
                chunks.append(chunk)
        return chunks
    
    words = text.split()
    test_chunks ={
        "QA": chunk_by_word(words, 150, 30),
        "Summary": chunk_by_word(words, 500, 100)
    }

    with open(chunks_output_path, "w", encoding="utf-8") as f:
        json.dump(test_chunks, f, ensure_ascii=False)

if __name__ == "__main__":
    main()