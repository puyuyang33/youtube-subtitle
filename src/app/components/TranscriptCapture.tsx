"use client";

import { useState, useRef } from "react";
import {
  fetchTranscriptClientSide,
  extractVideoId,
} from "@/lib/fetchTranscript";

interface TranscriptSnippet {
  text: string;
  start: number;
  duration: number;
}

interface TranscriptResult {
  videoId: string;
  snippets: TranscriptSnippet[];
  snippetCount: number;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TranscriptCapture() {
  const [videoUrl, setVideoUrl] = useState("");
  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const handleFetch = async () => {
    if (!videoUrl.trim()) {
      setError("Please enter a YouTube video URL or video ID.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const videoId = extractVideoId(videoUrl.trim());
      if (!videoId) {
        setError(
          "Could not extract a valid video ID. Please provide a valid YouTube URL or video ID."
        );
        return;
      }

      const data = await fetchTranscriptClientSide(
        videoId,
        lang.trim() || "en"
      );
      setResult(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = async () => {
    if (!result) return;
    const fullText = result.snippets.map((s) => s.text).join(" ");
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const content = result.snippets
      .map((s) => `[${formatTime(s.start)}] ${s.text}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${result.videoId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${result.videoId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSnippets = result?.snippets.filter((s) =>
    s.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleFetch();
    }
  };

  return (
    <div className="transcript-capture">
      {/* Hero Input Section */}
      <section className="hero-section">
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="logo-mark">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="8" fill="#FF0033" />
              <polygon points="16,12 16,28 28,20" fill="white" />
            </svg>
          </div>
          <h1 className="hero-title">
            YouTube Transcript
            <span className="hero-accent"> Capture</span>
          </h1>
          <p className="hero-subtitle">
            Extract subtitles and transcripts from any YouTube video instantly.
            <br />
            Powered by open-source technology.
          </p>

          <div className="input-group">
            <div className="input-wrapper">
              <svg
                className="input-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste YouTube URL or video ID…"
                className="url-input"
              />
            </div>

            <div className="lang-wrapper">
              <label className="lang-label">Language</label>
              <input
                type="text"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                placeholder="en"
                className="lang-input"
              />
            </div>

            <button
              onClick={handleFetch}
              disabled={loading}
              className="fetch-button"
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Fetch Transcript
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="error-toast">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Results Section */}
      {result && (
        <section className="results-section">
          <div className="results-header">
            <div className="results-meta">
              <span className="meta-badge">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                {result.videoId}
              </span>
              <span className="meta-pill">{result.snippetCount} segments</span>
            </div>

            <div className="results-actions">
              <div className="search-bar">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transcript…"
                  className="search-input"
                />
              </div>

              <button onClick={handleCopyAll} className="action-btn">
                {copied ? (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy All
                  </>
                )}
              </button>

              <button onClick={handleDownload} className="action-btn">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                .txt
              </button>

              <button onClick={handleDownloadJSON} className="action-btn">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                .json
              </button>
            </div>
          </div>

          {/* Video Embed */}
          <div className="video-embed-wrapper">
            <iframe
              src={`https://www.youtube.com/embed/${result.videoId}`}
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="video-embed"
            />
          </div>

          {/* Transcript List */}
          <div ref={transcriptRef} className="transcript-list">
            {filteredSnippets && filteredSnippets.length > 0 ? (
              filteredSnippets.map((snippet, i) => (
                <div key={i} className="snippet-row">
                  <span className="snippet-time">{formatTime(snippet.start)}</span>
                  <span className="snippet-text">{snippet.text}</span>
                </div>
              ))
            ) : (
              <div className="no-results">
                No matching segments found.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
