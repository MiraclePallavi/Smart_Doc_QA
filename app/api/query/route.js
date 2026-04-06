import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const PYTHON = "python";

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function POST(req) {
  try {
    const { question, chunks, embeddings } = await req.json();

    if (!question || !Array.isArray(chunks) || !Array.isArray(embeddings)) {
      return Response.json({ error: "Missing question/chunks/embeddings" }, { status: 400 });
    }

    const tmpDir = path.join(ROOT, "uploads");
    await fs.mkdir(tmpDir, { recursive: true });

    const qId = Date.now().toString();
    const questionInputPath = path.join(tmpDir, `${qId}.question.json`);
    const questionEmbeddingPath = path.join(tmpDir, `${qId}.question.embedding.json`);

    await fs.writeFile(questionInputPath, JSON.stringify([question]));

    const embedScript = path.join(ROOT, "python", "embed.py");
    await execFileAsync(PYTHON, [embedScript, questionInputPath, questionEmbeddingPath], {
      maxBuffer: 10 * 1024 * 1024,
    });

    const questionEmbeddings = JSON.parse(await fs.readFile(questionEmbeddingPath, "utf-8"));
    const queryEmbedding = questionEmbeddings[0];

    const scored = embeddings.map((emb, i) => ({
      score: cosineSimilarity(queryEmbedding, emb),
      text: chunks[i],
    }));

    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, 3);

    const answer = topChunks.length
      ? topChunks[0].text
      : "No relevant information found in the uploaded PDF.";

    return Response.json({
      answer,
      sources: topChunks,
    });
  } catch (error) {
    console.error("QUERY ERROR:", error);
    return Response.json(
      { error: error?.message || "Query failed" },
      { status: 500 }
    );
  }
}