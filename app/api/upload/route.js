import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const PYTHON = "python";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return Response.json({ error: "No PDF uploaded" }, { status: 400 });
    }

    const baseDir = path.join(os.tmpdir(), "smart-doc-qa");
    await fs.mkdir(baseDir, { recursive: true });

    const docId = Date.now().toString();
    const docDir = path.join(baseDir, docId);
    await fs.mkdir(docDir, { recursive: true });

    const pdfPath = path.join(docDir, "input.pdf");
    const chunksPath = path.join(docDir, "chunks.json");
    const embeddingsPath = path.join(docDir, "embeddings.json");

    await fs.writeFile(pdfPath, Buffer.from(await file.arrayBuffer()));

    const processPdfScript = path.join(ROOT, "python", "process_pdf.py");
    const embedScript = path.join(ROOT, "python", "embed.py");

    // Step 1: Extract chunks
    await execFileAsync(PYTHON, [processPdfScript, pdfPath, chunksPath], {
      maxBuffer: 10 * 1024 * 1024,
    });

    // Step 2: Generate embeddings
    await execFileAsync(PYTHON, [embedScript, chunksPath, embeddingsPath], {
      maxBuffer: 10 * 1024 * 1024,
    });

    // ✅ Verify files exist
    const chunksExists = await fs
      .access(chunksPath)
      .then(() => true)
      .catch(() => false);

    const embeddingsExists = await fs
      .access(embeddingsPath)
      .then(() => true)
      .catch(() => false);

    if (!chunksExists || !embeddingsExists) {
      return Response.json(
        { error: "Processing failed: embeddings not created" },
        { status: 500 }
      );
    }

    const chunks = JSON.parse(await fs.readFile(chunksPath, "utf-8"));

    return Response.json({
      docId,
      chunksCount: chunks.length,
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    return Response.json(
      { error: error?.message || "Upload failed" },
      { status: 500 }
    );
  }
}