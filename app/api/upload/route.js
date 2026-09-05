import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto"; 
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const PYTHON = "python";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 1. Read the file buffer into memory
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. Generate a unique SHA-256 hash based on the file content
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const docId = `doc_${fileHash.substring(0, 16)}`; 

    // 3. Define target directory path
    const docDir = path.join(os.tmpdir(), "smart-doc-qa", docId);
    const chunksPath = path.join(docDir, "chunks.json");
    const embeddingsPath = path.join(docDir, "embeddings.json");

    try {
      await fs.access(chunksPath);
      await fs.access(embeddingsPath);
      
      console.log(`♻️ Document ${docId} already exists. Reusing files to save space.`);
      return Response.json({ 
        status: "success", 
        docId, 
        message: "Existing document loaded instantly." 
      });
    } catch {
      console.log(`🆕 New document detected. Processing ${docId}...`);
    }

    // 4. Create directory if it doesn't exist
    await fs.mkdir(docDir, { recursive: true });

    const pdfPath = path.join(docDir, file.name);
    await fs.writeFile(pdfPath, buffer);

    const parseScript = path.join(ROOT, "python", "process_pdf.py");
    await execFileAsync(PYTHON, [parseScript, pdfPath, chunksPath]);

    const embedScript = path.join(ROOT, "python", "embed.py");
    await execFileAsync(PYTHON, [embedScript, chunksPath, embeddingsPath]);

    return Response.json({ 
      status: "success", 
      docId, 
      message: "Document processed and indexed successfully." 
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return Response.json({ error: "Upload processing failed" }, { status: 500 });
  }
}