const CORS_PROXY = "https://corsproxy.io/?";

export function extractVideoId(input: string): string | null {
  // Already a plain video ID (11 chars, alphanumeric + _ -)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
    return input.trim();
  }

  // Try to parse as URL
  try {
    const url = new URL(input.trim());

    // youtube.com/watch?v=ID
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return v;

      // youtube.com/embed/ID or youtube.com/shorts/ID
      const embedMatch = url.pathname.match(
        /\/(embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/
      );
      if (embedMatch) return embedMatch[2];
    }

    // youtu.be/ID
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1).split("/")[0] || null;
    }
  } catch {
    // Not a valid URL
  }

  // Last resort: try to extract any 11-char video ID looking pattern
  const idMatch = input.match(/([a-zA-Z0-9_-]{11})/);
  return idMatch ? idMatch[1] : null;
}

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

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

export async function fetchTranscriptClientSide(
  videoId: string,
  lang: string = "en"
): Promise<TranscriptResult> {
  // Step 1: Fetch the YouTube video page through CORS proxy
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const pageResponse = await fetch(
    CORS_PROXY + encodeURIComponent(pageUrl)
  );

  if (!pageResponse.ok) {
    throw new Error("Failed to fetch the YouTube video page.");
  }

  const html = await pageResponse.text();

  // Step 2: Extract captions config from the page HTML
  const captionsSplit = html.split('"captions":');
  if (captionsSplit.length < 2) {
    throw new Error(
      "No captions found. Transcripts may be disabled for this video."
    );
  }

  const captionsJsonRaw = captionsSplit[1].split(',"videoDetails')[0];

  let captionTracks: { languageCode: string; baseUrl: string; name?: { simpleText?: string } }[];

  try {
    const captions = JSON.parse(captionsJsonRaw.replace(/\n/g, ""));
    captionTracks =
      captions?.playerCaptionsTracklistRenderer?.captionTracks;
  } catch {
    // Try alternative: extract captionTracks array directly
    const match = html.match(/"captionTracks"\s*:\s*(\[[\s\S]*?\])/);
    if (!match) {
      throw new Error("Could not parse captions data from the video page.");
    }
    captionTracks = JSON.parse(match[1]);
  }

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No transcript tracks available for this video.");
  }

  // Step 3: Find matching language track (fallback to first available)
  let track = captionTracks.find((t) => t.languageCode === lang);
  if (!track) {
    track = captionTracks[0];
  }

  // Step 4: Fetch transcript XML
  const transcriptResponse = await fetch(
    CORS_PROXY + encodeURIComponent(track.baseUrl)
  );

  if (!transcriptResponse.ok) {
    throw new Error("Failed to fetch transcript data.");
  }

  const xml = await transcriptResponse.text();

  // Step 5: Parse XML
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const textElements = doc.querySelectorAll("text");

  const snippets: TranscriptSnippet[] = Array.from(textElements).map(
    (el) => ({
      text: decodeHtmlEntities(el.textContent || ""),
      start: parseFloat(el.getAttribute("start") || "0"),
      duration: parseFloat(el.getAttribute("dur") || "0"),
    })
  );

  return {
    videoId,
    snippets,
    snippetCount: snippets.length,
  };
}
