import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
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

    const uploadDir = path.join(ROOT, "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const id = Date.now().toString();
    const pdfPath = path.join(uploadDir, `${id}.pdf`);
    const chunksPath = path.join(uploadDir, `${id}.chunks.json`);
    const embeddingsPath = path.join(uploadDir, `${id}.embeddings.json`);

    await fs.writeFile(pdfPath, Buffer.from(await file.arrayBuffer()));

    const processPdfScript = path.join(ROOT, "python", "process_pdf.py");
    const embedScript = path.join(ROOT, "python", "embed.py");

    await execFileAsync(PYTHON, [processPdfScript, pdfPath, chunksPath], {
      maxBuffer: 10 * 1024 * 1024,
    });

    await execFileAsync(PYTHON, [embedScript, chunksPath, embeddingsPath], {
      maxBuffer: 10 * 1024 * 1024,
    });

    const chunks = JSON.parse(await fs.readFile(chunksPath, "utf-8"));
    const embeddings = JSON.parse(await fs.readFile(embeddingsPath, "utf-8"));

    return Response.json({ docId: id, chunks, embeddings });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return Response.json(
      { error: error?.message || "Upload failed" },
      { status: 500 }
    );
  }
}