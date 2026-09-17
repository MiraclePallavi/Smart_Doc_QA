

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const backendFormData = new FormData();
    backendFormData.append("file", file);

    const backendRes = await fetch("http://localhost:8000/chunk", {
      method: "POST",
      body: backendFormData,
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text();
      return Response.json({ error: "Backend processing failed", detail: errText }, { status: backendRes.status });
    }

    const data = await backendRes.json(); 

    return Response.json({
      status: "success",
      documentId: data.document_id,
      chunkCount: data.chunk_count,
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return Response.json({ error: "Upload processing failed" }, { status: 500 });
  }
}