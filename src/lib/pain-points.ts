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
