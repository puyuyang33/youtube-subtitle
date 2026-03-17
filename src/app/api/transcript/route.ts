import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

function extractVideoId(input: string): string | null {
  // Already a plain video ID (11 chars, alphanumeric + _ -)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
    return input.trim();
  }

  // Try to parse as URL
  try {
    const url = new URL(input.trim());

    // youtube.com/watch?v=ID
    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v");
    }

    // youtu.be/ID
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1).split("/")[0] || null;
    }

    // youtube.com/embed/ID or youtube.com/shorts/ID
    const embedMatch = url.pathname.match(
      /\/(embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/
    );
    if (embedMatch) {
      return embedMatch[2];
    }
  } catch {
    // Not a valid URL
  }

  // Last resort: try to extract any 11-char video ID looking pattern
  const idMatch = input.match(/([a-zA-Z0-9_-]{11})/);
  return idMatch ? idMatch[1] : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoUrl, lang } = body;

    if (!videoUrl || typeof videoUrl !== "string") {
      return NextResponse.json(
        { error: "Please provide a YouTube video URL or video ID." },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return NextResponse.json(
        {
          error:
            "Could not extract a valid video ID. Please provide a valid YouTube URL or video ID.",
        },
        { status: 400 }
      );
    }

    const config: { lang?: string } = {};
    if (lang && typeof lang === "string") {
      config.lang = lang;
    }

    const transcriptItems = await YoutubeTranscript.fetchTranscript(
      videoId,
      config
    );

    // Format the response similar to the Python youtube-transcript-api
    const snippets = transcriptItems.map((item) => ({
      text: item.text,
      start: item.offset / 1000, // convert ms to seconds
      duration: item.duration / 1000,
    }));

    return NextResponse.json({
      videoId,
      snippets,
      snippetCount: snippets.length,
    });
  } catch (error: unknown) {
    console.error("Transcript fetch error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to fetch transcript";

    // Detect common error types
    if (message.includes("disabled") || message.includes("Transcript")) {
      return NextResponse.json(
        {
          error:
            "Transcripts are disabled for this video, or no transcript is available.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `Failed to fetch transcript: ${message}` },
      { status: 500 }
    );
  }
}
