"use client";

import { useState } from "react";
import { Upload, Link, MessageSquare, FileText } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [currentQuery, setCurrentQuery] = useState("");
  const [documentId, setDocumentId] = useState<string | null>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setDocumentId(result.documentId);
        setMessages([
          {
            role: "assistant",
            content:
              "Document uploaded and processed successfully! You can now ask questions about it.",
          },
        ]);
      } else {
        setMessages([{ role: "assistant", content: `Error: ${result.error}` }]);
      }
    } catch (error) {
      setMessages([
        {
          role: "assistant",
          content: "Error uploading file. Please try again.",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = async (url: string) => {
    if (!url) return;

    setIsProcessing(true);
    try {
      const response = await fetch("/api/process-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();
      if (result.success) {
        setDocumentId(result.documentId);
        setMessages([
          {
            role: "assistant",
            content:
              "URL processed successfully! You can now ask questions about the content.",
          },
        ]);
      } else {
        setMessages([{ role: "assistant", content: `Error: ${result.error}` }]);
      }
    } catch (error) {
      setMessages([
        {
          role: "assistant",
          content: "Error processing URL. Please try again.",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuery = async () => {
    if (!currentQuery.trim() || !documentId) return;

    const userMessage = { role: "user" as const, content: currentQuery };
    setMessages((prev) => [...prev, userMessage]);
    setCurrentQuery("");

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: currentQuery,
          documentId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.answer },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${result.error}` },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error processing query. Please try again.",
        },
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Docugent</h1>
            <p className="text-xl text-gray-600">
              Upload documents or provide URLs and ask questions about their
              content
            </p>
          </div>

          {!documentId && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex space-x-1 mb-6">
                <button
                  onClick={() => setActiveTab("upload")}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
                    activeTab === "upload"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Upload size={20} />
                  <span>Upload File</span>
                </button>
                <button
                  onClick={() => setActiveTab("url")}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
                    activeTab === "url"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Link size={20} />
                  <span>URL</span>
                </button>
              </div>

              {activeTab === "upload" && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg text-gray-600 mb-4">
                    Upload a PDF or DOCX file
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? "Processing..." : "Choose File"}
                  </label>
                </div>
              )}

              {activeTab === "url" && (
                <UrlInput
                  onSubmit={handleUrlSubmit}
                  isProcessing={isProcessing}
                />
              )}
            </div>
          )}

          {documentId && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <h2 className="text-xl font-semibold">Ask Questions</h2>
              </div>

              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      message.role === "user"
                        ? "bg-blue-50 ml-8"
                        : "bg-gray-50 mr-8"
                    }`}
                  >
                    <p className="text-gray-800">{message.content}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex space-x-2">
                <input
                  type="text"
                  value={currentQuery}
                  onChange={(e) => setCurrentQuery(e.target.value)}
                  placeholder="Ask a question about the document..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === "Enter" && handleQuery()}
                />
                <button
                  onClick={handleQuery}
                  disabled={!currentQuery.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ask
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UrlInput({
  onSubmit,
  isProcessing,
}: {
  onSubmit: (url: string) => void;
  isProcessing: boolean;
}) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(url);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="url"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Enter URL
        </label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/document"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isProcessing || !url.trim()}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? "Processing..." : "Process URL"}
      </button>
    </form>
  );
}
