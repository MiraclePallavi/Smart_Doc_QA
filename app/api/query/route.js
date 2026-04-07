import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const PYTHON = "python";

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function POST(req) {
  try {
    const { docId, question } = await req.json();

    if (!docId || !question) {
      return Response.json({ error: "Missing input" }, { status: 400 });
    }

    // 📁 locate stored files
    const docDir = path.join(os.tmpdir(), "smart-doc-qa", docId);
    const chunksPath = path.join(docDir, "chunks.json");
    const embeddingsPath = path.join(docDir, "embeddings.json");

    // 📥 read files
    const [chunksRaw, embeddingsRaw] = await Promise.all([
      fs.readFile(chunksPath, "utf-8"),
      fs.readFile(embeddingsPath, "utf-8"),
    ]);

    const chunks = JSON.parse(chunksRaw);
    const embeddings = JSON.parse(embeddingsRaw);

    // 🤖 get query embedding
    const embedScript = path.join(ROOT, "python", "embed_one.py");

    const { stdout } = await execFileAsync(PYTHON, [
      embedScript,
      question,
    ]);

    const queryEmbedding = JSON.parse(stdout);

    // 🔍 similarity search
    const scores = embeddings.map((emb, i) => ({
      score: cosineSimilarity(queryEmbedding, emb),
      text: chunks[i],
    }));

    scores.sort((a, b) => b.score - a.score);

    const topChunks = scores.slice(0, 3);

    return Response.json({
      answer: topChunks.map((c) => c.text).join("\n\n"),
      sources: topChunks,
    });

  } catch (err) {
    console.error("QUERY ERROR:", err);
    return Response.json({ error: "Query failed" }, { status: 500 });
  }
}