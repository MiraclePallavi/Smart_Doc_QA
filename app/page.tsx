"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileText, Send } from "lucide-react";

type Source = {
  text: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert("Please choose a PDF first.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = await res.json().catch(() => null);

    setLoading(false);

    if (!res.ok || !result?.docId) {
      alert(result?.error || "Upload failed");
      return;
    }

    setDocId(result.docId);
    alert("✅ PDF uploaded successfully!");
  };

  const handleAsk = async () => {
    if (!docId) {
      alert("Upload a PDF first.");
      return;
    }

    if (!question.trim()) {
      alert("Enter a question.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        docId,
        question,
      }),
    });

    const result = await res.json().catch(() => null);

    setLoading(false);

    if (!res.ok || !result) {
      alert("Query failed");
      return;
    }

    setAnswer(result.answer);
    setSources(result.sources ?? []);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 to-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">📄 Smart Doc Q&A</h1>
          <p className="text-gray-400 mt-2">Upload a PDF and ask anything instantly</p>
        </div>

        {/* Upload Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <UploadCloud className="text-blue-400" />
            <h2 className="font-semibold text-lg">Upload Document</h2>
          </div>

          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mb-4 block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-500"
          />

          <button
            onClick={handleUpload}
            className="w-full bg-blue-600 hover:bg-blue-500 transition px-4 py-2 rounded-xl font-medium"
          >
            Upload PDF
          </button>
        </motion.div>

        {/* Query Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <FileText className="text-green-400" />
            <h2 className="font-semibold text-lg">Ask Question</h2>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask something about the document..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <button
              onClick={handleAsk}
              disabled={!docId}
              className="bg-green-600 hover:bg-green-500 transition px-4 py-2 rounded-xl flex items-center gap-2"
            >
              <Send size={16} /> Ask
            </button>
          </div>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="text-center text-gray-400 animate-pulse">Thinking...</div>
        )}

        {/* Answer */}
        {answer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl"
          >
            <h2 className="font-semibold text-lg mb-2">Answer</h2>
            <p className="text-gray-200 leading-relaxed">{answer}</p>
          </motion.div>
        )}

        {/* Sources */}
        {sources.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl"
          >
            <h2 className="font-semibold text-lg mb-3">Sources</h2>
            <div className="space-y-2">
              {sources.map((s, i) => (
                <div
                  key={i}
                  className="bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-gray-300"
                >
                  {s.text}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
