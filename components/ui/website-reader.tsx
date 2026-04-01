"use client";

import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { ChevronRight, Loader, Check, Send, ArrowLeft } from "lucide-react";

type Step = "url-input" | "processing" | "success" | "asking";
type ProcessingStage = "fetching" | "extracting" | "summarizing" | "complete";

interface WebsiteReaderProps {
  onBack?: () => void;
}

export default function WebsiteReader({ onBack }: WebsiteReaderProps) {
  const [step, setStep] = useState<Step>("url-input");
  const [url, setUrl] = useState("");
  const [processingStage, setProcessingStage] = useState<ProcessingStage>("fetching");
  const [result, setResult] = useState<any>(null);
  const [question, setQuestion] = useState("");
  const [questionLoading, setQuestionLoading] = useState(false);
  const [answers, setAnswers] = useState<Array<{ q: string; a: string }>>([]);
  const [error, setError] = useState("");

  const processingMessages = {
    fetching: "🌐 Fetching website content...",
    extracting: "📄 Extracting main content...",
    summarizing: "🤖 Summarizing with AI...",
    complete: "✨ Processing complete!"
  };

  const handleSubmitURL = async () => {
    if (!url.trim()) {
      setError("Please enter a valid URL");
      return;
    }

    setError("");
    setStep("processing");
    setProcessingStage("fetching");

    try {
      let urlToFetch = url;
      if (!urlToFetch.startsWith("http://") && !urlToFetch.startsWith("https://")) {
        urlToFetch = "https://" + urlToFetch;
      }

      // Simulate stage transitions
      setTimeout(() => setProcessingStage("extracting"), 1000);
      setTimeout(() => setProcessingStage("summarizing"), 2000);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ url: urlToFetch }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to analyze URL");
      }

      const data = await res.json();
      setResult(data);
      setProcessingStage("complete");

      // Move to success step after showing completion
      setTimeout(() => {
        setStep("success");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStep("url-input");
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      setError("Please enter a question");
      return;
    }

    setError("");
    setQuestionLoading(true);

    try {
      const res = await fetch("/api/question", {
        method: "POST",
        body: JSON.stringify({
          question: question.trim(),
          content: result.rawContent,
          summary: result.summary,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to get answer");
      }

      const data = await res.json();
      setAnswers([...answers, { q: question, a: data.answer }]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setQuestionLoading(false);
    }
  };

  const handleReset = () => {
    setStep("url-input");
    setUrl("");
    setQuestion("");
    setAnswers([]);
    setError("");
    setResult(null);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        {/* Header with back button */}
        {step !== "url-input" && (
          <button
            onClick={handleReset}
            className="absolute top-8 left-8 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-300 backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="max-w-2xl w-full">
          {/* URL Input Step */}
          {step === "url-input" && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center space-y-4">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Website Reader
                </h1>
                <p className="text-slate-300 text-lg">
                  Analyze any website and ask questions about its content
                </p>
              </div>

              <div className="space-y-4 backdrop-blur-md bg-white/10 p-8 rounded-2xl border border-white/20 hover:border-white/40 transition-colors duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">
                    Enter Website URL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSubmitURL()}
                    className="bg-white/5 border-white/20 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm animate-shake">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleSubmitURL}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  Analyze Website
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === "processing" && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold">Processing Website</h2>
              </div>

              <div className="backdrop-blur-md bg-white/10 p-8 rounded-2xl border border-white/20 space-y-4">
                {/* Fetching Stage */}
                <div className="flex items-center gap-4 group">
                  <div
                    className={`transition-all duration-500 ${
                      processingStage !== "fetching"
                        ? "text-green-400"
                        : "text-blue-400 animate-spin"
                    }`}
                  >
                    {processingStage === "fetching" ? (
                      <Loader className="w-6 h-6" />
                    ) : (
                      <Check className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {processingMessages.fetching}
                    </p>
                    <div
                      className={`h-1 bg-white/10 rounded-full mt-2 overflow-hidden transition-all duration-500 ${
                        processingStage !== "fetching"
                          ? "opacity-0 h-0"
                          : "opacity-100"
                      }`}
                    >
                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Extracting Stage */}
                <div className="flex items-center gap-4">
                  <div
                    className={`transition-all duration-500 ${
                      ["extracting", "summarizing", "complete"].includes(
                        processingStage
                      )
                        ? processingStage === "extracting"
                          ? "text-blue-400 animate-spin"
                          : "text-green-400"
                        : "text-slate-400"
                    }`}
                  >
                    {processingStage === "extracting" ? (
                      <Loader className="w-6 h-6" />
                    ) : ["extracting", "summarizing", "complete"].includes(
                        processingStage
                      ) ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-current" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {processingMessages.extracting}
                    </p>
                    {["extracting", "summarizing", "complete"].includes(
                      processingStage
                    ) && (
                      <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 w-full"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summarizing Stage */}
                <div className="flex items-center gap-4">
                  <div
                    className={`transition-all duration-500 ${
                      ["summarizing", "complete"].includes(processingStage)
                        ? processingStage === "summarizing"
                          ? "text-blue-400 animate-spin"
                          : "text-green-400"
                        : "text-slate-400"
                    }`}
                  >
                    {processingStage === "summarizing" ? (
                      <Loader className="w-6 h-6" />
                    ) : ["summarizing", "complete"].includes(processingStage) ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-current" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {processingMessages.summarizing}
                    </p>
                    {["summarizing", "complete"].includes(processingStage) && (
                      <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-pink-400 to-pink-600 w-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center animate-scale-in">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold">Successfully Analyzed!</h2>
                <p className="text-slate-300">
                  Your website has been processed. Now you can ask questions about
                  the content.
                </p>
              </div>

              <div className="backdrop-blur-md bg-white/10 p-8 rounded-2xl border border-white/20 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-blue-300">
                    Summary
                  </h3>
                  <p className="text-slate-200 leading-relaxed text-sm">
                    {result?.summary}
                  </p>
                  <p className="text-xs text-slate-400 mt-3">
                    📊 Analyzed {result?.contentLength} characters from{" "}
                    <span className="text-blue-300 font-mono">{result?.url}</span>
                  </p>
                </div>

                <button
                  onClick={() => setStep("asking")}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  Ask Questions About Content
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* Asking Step */}
          {step === "asking" && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">Ask Questions</h2>
                <p className="text-slate-300">
                  Ask anything about the website content
                </p>
              </div>

              {/* Summary display */}
              <div className="backdrop-blur-md bg-white/5 p-6 rounded-2xl border border-white/20 max-h-32 overflow-y-auto">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {result?.summary}
                </p>
              </div>

              {/* Question input */}
              <div className="backdrop-blur-md bg-white/10 p-8 rounded-2xl border border-white/20 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">
                    Your Question
                  </label>
                  <textarea
                    placeholder="What would you like to know about this content?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 resize-none"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm animate-shake">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleAskQuestion}
                  disabled={questionLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  {questionLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Getting Answer...
                    </>
                  ) : (
                    <>
                      Ask Question
                      <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>

              {/* Answers display */}
              {answers.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Q&A History</h3>
                  {answers.map((item, index) => (
                    <div
                      key={index}
                      className="backdrop-blur-md bg-white/5 p-6 rounded-2xl border border-white/20 space-y-3 animate-fade-in"
                    >
                      <div className="flex gap-3">
                        <span className="text-purple-400 font-semibold flex-shrink-0">Q:</span>
                        <p className="text-slate-200">{item.q}</p>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-green-400 font-semibold flex-shrink-0">A:</span>
                        <p className="text-slate-300 leading-relaxed">{item.a}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-white/5 backdrop-blur-sm py-6 mt-auto">
        <div className="max-w-2xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© 2026 Created by Ajrin | Milpitas High School, California</p>
        </div>
      </footer>

      {/* Animations CSS */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          10%,
          90% {
            transform: translateX(-2px);
          }
          20%,
          80% {
            transform: translateX(2px);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.4s ease-out;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
