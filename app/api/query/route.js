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

    // 🧠 Step 1: Classify routing intent via Gemini
    const intentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Classify if this query requires a granular, specific fact lookup ("QA") or a broad, high-level structural overview ("SUMMARY"). Reply with ONLY the word "QA" or "SUMMARY". Query: ${question}`,
    });

    let targetTask = intentResponse.text.trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (targetTask !== "QA" && targetTask !== "SUMMARY") {
      targetTask = "QA"; 
    }

  // 🔍 Case-Insensitive Key Lookup: Find the key regardless of its capitalization layout
    const matchedChunksKey = Object.keys(allChunks).find(
      (k) => k.toLowerCase() === targetTask.toLowerCase()
    );
    const matchedEmbeddingsKey = Object.keys(allEmbeddings).find(
      (k) => k.toLowerCase() === targetTask.toLowerCase()
    );

    let chunks = allChunks[matchedChunksKey];
    let embeddings = allEmbeddings[matchedEmbeddingsKey];

    // 🔄 Backwards-Compatibility Adapter: Handle old flat array schemas
    if (!chunks && Array.isArray(allChunks)) {
      console.log("⚠️ Legacy flat-array schema detected. Falling back to entire dataset.");
      chunks = allChunks;
      embeddings = allEmbeddings;
    }

    // If it's still missing after the case-insensitive search, reject safely
    if (!chunks || !embeddings) {
      return Response.json({ 
        error: `Database structure mismatch. Target pool '${targetTask}' could not be resolved.`,
        allChunksKeys: Array.isArray(allChunks) ? "Flat Array" : Object.keys(allChunks)
      }, { status: 500 });
    }

    // If it's still missing after the fallback check, reject it safely
    if (!chunks || !embeddings) {
      return Response.json({ 
        error: `Database structure mismatch. Target pool '${targetTask}' could not be resolved.`,
        allChunksKeys: Array.isArray(allChunks) ? "Flat Array" : Object.keys(allChunks)
      }, { status: 500 });
    }

    // 🤖 Step 2: Generate Vector Embedding for Question
    const embedScript = path.join(ROOT, "python", "embed_one.py");
    const { stdout } = await execFileAsync(PYTHON, [embedScript, question]);
    
    // 🛡️ Safe Parse: Isolate the pure JSON array bracket, stripping away random terminal warnings
    const jsonStartIndex = stdout.indexOf("[");
    if (jsonStartIndex === -1) {
      throw new Error(`Python script failed to return a valid JSON vector array. Raw output: ${stdout}`);
    }
    const cleanStdout = stdout.slice(jsonStartIndex).trim();
    const queryEmbedding = JSON.parse(cleanStdout);

    // 🔍 Step 3: Run Similarity Indexing Logic
    const scores = embeddings.map((emb, i) => ({
      score: cosineSimilarity(queryEmbedding, emb),
      text: chunks[i] || "",
    }));

    scores.sort((a, b) => b.score - a.score);

    const topChunks = scores.slice(0, 3).filter(s => s.score > 0.25);
    if (topChunks.length === 0 && scores.length > 0) {
      topChunks.push(scores[0]); 
    }

    const contextText = topChunks.length > 0 
      ? topChunks.map((c) => c.text).join("\n\n")
      : "No relevant matching context could be derived from document vectors.";

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
   const refId = crypto.randomUUID();
    console.error(`🔴 QUERY FAILURE [ref: ${refId}]`, err);
    
    return Response.json({ 
      error: "Query processing encountered a fatal error.",
      refId
  }, { status: 500 });
}
}