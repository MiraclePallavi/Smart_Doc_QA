export async function POST(req) {
  try {
    const { documentId, question } = await req.json();

    if (!documentId || !question) {
      return Response.json({ error: "Missing input" }, { status: 400 });
    }

    const backendRes = await fetch("http://localhost:8000/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        document_id: documentId,
        top_k: 3,
      }),
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text();
      return Response.json({ error: "Query processing failed", detail: errText }, { status: backendRes.status });
    }

    const data = await backendRes.json(); // { answer, sources }
    return Response.json(data);

  } catch (err) {
    console.error("QUERY ERROR:", err);
    return Response.json({ error: "Query processing encountered a fatal error." }, { status: 500 });
  }
}