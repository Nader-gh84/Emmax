import type { SourcePlatform } from "@/types/translator";
import {
  PLATFORM_LABELS,
  UPLOAD_FALLBACK_PLATFORMS,
} from "@/types/translator";

const DIRECT_AUDIO_EXT = /\.(mp3|m4a|wav|ogg|flac|aac|mpeg)(\?.*)?$/i;
const DIRECT_VIDEO_EXT = /\.(mp4|webm|mov|avi|mkv|m4v)(\?.*)?$/i;
const PODCAST_HOSTS = [
  "podcasts.apple.com",
  "open.spotify.com",
  "soundcloud.com",
  "anchor.fm",
  "pocketcasts.com",
];

export function detectPlatform(rawUrl: string): SourcePlatform {
  let hostname = "";
  let pathname = "";

  try {
    const url = new URL(rawUrl.trim());
    hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    pathname = url.pathname;
  } catch {
    return "other";
  }

  if (
    hostname.includes("youtube.com") ||
    hostname === "youtu.be" ||
    hostname.includes("youtube-nocookie.com")
  ) {
    return "youtube";
  }
  if (hostname.includes("tiktok.com")) return "tiktok";
  if (hostname.includes("instagram.com")) return "instagram";
  if (
    hostname.includes("facebook.com") ||
    hostname.includes("fb.watch") ||
    hostname === "fb.com"
  ) {
    return "facebook";
  }
  if (
    hostname === "x.com" ||
    hostname.includes("twitter.com") ||
    hostname === "t.co"
  ) {
    return "twitter";
  }
  if (hostname.includes("vimeo.com")) return "vimeo";
  if (PODCAST_HOSTS.some((host) => hostname.includes(host))) return "podcast";

  const pathAndQuery = `${pathname}${rawUrl}`;
  if (DIRECT_AUDIO_EXT.test(pathAndQuery)) return "direct_audio";
  if (DIRECT_VIDEO_EXT.test(pathAndQuery)) return "direct_video";

  return "other";
}

export function platformLabel(platform: SourcePlatform): string {
  return PLATFORM_LABELS[platform] ?? PLATFORM_LABELS.other;
}

export function requiresUploadFallback(platform: SourcePlatform): boolean {
  return UPLOAD_FALLBACK_PLATFORMS.includes(platform);
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function guessTitleFromUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());
    const last = url.pathname.split("/").filter(Boolean).pop();
    if (last) {
      return decodeURIComponent(last.replace(/\+/g, " ")).slice(0, 180);
    }
    return url.hostname;
  } catch {
    return "Untitled media";
  }
}
