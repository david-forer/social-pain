export type PainSource = "reddit" | "hn" | "twitter";

export interface PainPoint {
  id: string;
  title: string;
  selftext: string;
  // Origin label: subreddit name, "Hacker News", or a Twitter handle
  subreddit: string;
  score: number;
  // Reddit-style path for reddit items; non-reddit items carry a full url instead
  permalink: string;
  created_utc: number;
  num_comments: number;
  type: "post" | "comment";
  // Optional so items saved before multi-source support still load
  source?: PainSource;
  url?: string;
  // Reddit username, useful for spotting vendors posing as commenters
  author?: string;
  // For comments: the id of the post they answer
  parent_id?: string;
}

export const PAIN_SOURCES: PainSource[] = ["reddit", "hn", "twitter"];
export const TIME_WINDOWS = ["week", "month", "year", "all"] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];

export function isPainSource(value: unknown): value is PainSource {
  return typeof value === "string" && (PAIN_SOURCES as string[]).includes(value);
}

export function isTimeWindow(value: unknown): value is TimeWindow {
  return typeof value === "string" && (TIME_WINDOWS as readonly string[]).includes(value);
}

// Full shape check for items coming back from the browser before they are stored
export function isPainPoint(value: unknown): value is PainPoint {
  const p = value as Record<string, unknown> | null;
  return (
    !!p &&
    typeof p.id === "string" && p.id.length > 0 &&
    typeof p.title === "string" && p.title.length > 0 &&
    typeof p.selftext === "string" &&
    typeof p.subreddit === "string" &&
    typeof p.score === "number" &&
    typeof p.permalink === "string" && p.permalink.length > 0 &&
    typeof p.created_utc === "number" &&
    typeof p.num_comments === "number" &&
    (p.type === "post" || p.type === "comment") &&
    (p.source === undefined || isPainSource(p.source)) &&
    (p.url === undefined || typeof p.url === "string") &&
    (p.author === undefined || typeof p.author === "string") &&
    (p.parent_id === undefined || typeof p.parent_id === "string")
  );
}

export const SOURCE_LABELS: Record<PainSource, string> = {
  reddit: "Reddit",
  hn: "Hacker News",
  twitter: "Twitter",
};

export function painPointUrl(p: PainPoint): string {
  if (p.url) return p.url;
  return `https://www.reddit.com${p.permalink}`;
}

export function painPointOrigin(p: PainPoint): string {
  switch (p.source) {
    case "hn":
      return "Hacker News";
    case "twitter":
      return `@${p.subreddit}`;
    default:
      return `r/${p.subreddit}`;
  }
}

export function painPointSourceLabel(p: PainPoint): string {
  return SOURCE_LABELS[p.source ?? "reddit"];
}

// Shared across sources: phrases that mark a post as someone describing a problem
export const PAIN_PHRASES = [
  "struggling",
  "overwhelmed",
  "frustrated",
  "how do you",
  "wasting time",
  "takes forever",
  "so annoying",
  "can't keep up",
  "not working",
  "total mess",
  "nightmare",
  "hate",
  "anyone else",
  "drowning",
  "burnt out",
  "burned out",
];

export function painScore(text: string): number {
  const lower = text.toLowerCase();
  return PAIN_PHRASES.reduce((n, phrase) => (lower.includes(phrase) ? n + 1 : n), 0);
}

// Convert the UI time window to a unix cutoff in seconds, or null for "all"
export function timeWindowStart(time: string): number | null {
  const day = 86_400;
  const spans: Record<string, number> = { week: 7 * day, month: 30 * day, year: 365 * day };
  const span = spans[time];
  return span ? Math.floor(Date.now() / 1000) - span : null;
}
