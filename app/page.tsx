"use client";
import { useState } from "react";

type UploadData = {
  chunks: unknown[];
  embeddings: unknown[];
};

type Source = {
  text: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<UploadData | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);

  // upload handler
  const handleUpload = async () => {
    if (!file) {
      alert("Please choose a PDF first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

   const res = await fetch("/api/upload", {
  method: "POST",
  body: formData,
});

const result = await res.json().catch(() => null);

if (!res.ok || !result?.chunks) {
  alert(result?.error || "Upload failed");
  return;
}

setData(result);
  };

  // query handler
  const handleAsk = async () => {
    if (!data) {
      alert("Upload a PDF before asking a question.");
      return;
    }
const res = await fetch("/api/query", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    question,
    chunks: data.chunks,
    embeddings: data.embeddings,
  }),
});

const result = await res.json().catch(() => null);

if (!res.ok || !result) {
  alert("Query failed");
  return;
}

setAnswer(result.answer);
setSources(result.sources ?? []);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-4 text-blue-900 text-lg font-semibold">
        Upload a PDF, then ask questions about its content!
      </div >
      <div className="items-center justify-center mt-40">
      <h1 className="text-2xl font-bold mb-4">
        RAG PDF Q&A
      </h1>

      {/* Upload */}
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="mb-2"
      />
      <button
        onClick={handleUpload}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Upload PDF
      </button>

      {/* Question */}
      <div className="mt-6">
        <input
          type="text"
          placeholder="Ask a question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full border p-2"
        />
        <button
          onClick={handleAsk}
          className="mt-2 bg-green-500 text-white px-4 py-2 rounded"
        >
          Ask
        </button>
      </div>

      {/* Answer */}
      {answer && (
        <div className="mt-6">
          <h2 className="font-semibold">Answer:</h2>
          <p>{answer}</p>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="mt-4">
          <h2 className="font-semibold">Sources:</h2>
          {sources.map((s, i) => (
            <div key={i} className="border p-2 mt-2 text-sm">
              {s.text}
            </div>
          ))}
        </div>
      )}
     </div>
    </div>
  );
}
