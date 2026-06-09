import { GoogleGenAI } from "@google/genai";
import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const PYTHON = "python";

const ai = new GoogleGenAI({});

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

    const docDir = path.join(os.tmpdir(), "smart-doc-qa", docId);
    const chunksPath = path.join(docDir, "chunks.json");
    const embeddingsPath = path.join(docDir, "embeddings.json");

    const [chunksRaw, embeddingsRaw] = await Promise.all([
      fs.readFile(chunksPath, "utf-8"),
      fs.readFile(embeddingsPath, "utf-8"),
    ]);

    const allChunks = JSON.parse(chunksRaw);
    const allEmbeddings = JSON.parse(embeddingsRaw);

    const intentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Classify if this query requires a granular, specific fact lookup ("QA") or a broad, high-level structural overview ("SUMMARY"). Reply with ONLY the word "QA" or "SUMMARY". Query: ${question}`,
    });

    let targetTask = intentResponse.text.trim().toUpperCase().replace(/[^A-Z]/g, "");
    
    if (targetTask !== "QA" && targetTask !== "SUMMARY") {
      targetTask = "QA"; 
    }

    const chunks = allChunks[targetTask];
    const embeddings = allEmbeddings[targetTask];

    if (!chunks || !embeddings) {
      return Response.json({ error: `Requested task data for '${targetTask}' was not found.` }, { status: 500 });
    }

    const embedScript = path.join(ROOT, "python", "embed_one.py");
    const { stdout } = await execFileAsync(PYTHON, [embedScript, question]);
    const queryEmbedding = JSON.parse(stdout);

    const scores = embeddings.map((emb, i) => ({
      score: cosineSimilarity(queryEmbedding, emb),
      text: chunks[i],
    }));

    scores.sort((a, b) => b.score - a.score);

    const topChunks = scores.slice(0, 3).filter(s => s.score > 0.25);
    if (topChunks.length === 0) topChunks.push(scores[0]); 

    const contextText = topChunks.map((c) => c.text).join("\n\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert document assistant. Answer the user's question accurately using ONLY the provided text context below. If the answer cannot be found in the context, politely state that you do not know.
      
Context:
${contextText}

Question: ${question}`,
    });

    return Response.json({
      answer: response.text,
      sources: topChunks.map((s) => ({ text: s.text })),
    });

  } catch (err) {
    console.error("QUERY ERROR:", err);
    return Response.json({ error: "Query failed" }, { status: 500 });
  }
}