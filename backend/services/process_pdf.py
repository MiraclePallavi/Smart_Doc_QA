import fitz
import re


def split_into_sentences(text: str) -> list[str]:
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

def chunk_by_sentence(
    sentences: list[str],
    chunk_size: int,
    overlap: int
) -> list[str]:

    chunks = []

    current = []
    current_word_count = 0

    for sentence in sentences:

        word_count = len(sentence.split())

        current.append(sentence)
        current_word_count += word_count

        if current_word_count >= chunk_size:

            chunks.append(" ".join(current))

            overlap_sentences = []
            overlap_word_count = 0

            for previous_sentence in reversed(current):

                previous_word_count = len(previous_sentence.split())

                if overlap_word_count + previous_word_count > overlap:
                    break

                overlap_sentences.insert(0, previous_sentence)
                overlap_word_count += previous_word_count

            current = overlap_sentences
            current_word_count = overlap_word_count

    if current:
        chunks.append(" ".join(current))

    return chunks

def process_pdf_bytes(contents: bytes) -> dict:
    doc = fitz.open(stream=contents, filetype="pdf")
    text_parts = [page.get_text() for page in doc]
    text = " ".join(text_parts)

    sentences = split_into_sentences(text)
    return {
        "QA": chunk_by_sentence(sentences, 150, 30),
        "Summary": chunk_by_sentence(sentences, 500, 100),
    }

