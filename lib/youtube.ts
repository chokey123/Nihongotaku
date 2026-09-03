const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeVideoId(value: string): string | null {
  const input = value.trim();

  if (!input) return null;
  if (YOUTUBE_VIDEO_ID_PATTERN.test(input)) return input;

  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    let candidate = "";

    if (hostname === "youtu.be") {
      candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
    } else if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "music.youtube.com" ||
      hostname === "youtube-nocookie.com"
    ) {
      candidate =
        url.searchParams.get("v") ??
        url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] ??
        "";
    }

    return YOUTUBE_VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function timestampToSeconds(timestamp: string): number | null {
  const parts = timestamp.replaceAll("：", ":").split(":").map(Number);

  if (
    (parts.length !== 2 && parts.length !== 3) ||
    parts.some((part) => !Number.isInteger(part) || part < 0)
  ) {
    return null;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return seconds < 60 ? minutes * 60 + seconds : null;
  }

  const [hours, minutes, seconds] = parts;
  return minutes < 60 && seconds < 60
    ? hours * 3600 + minutes * 60 + seconds
    : null;
}
