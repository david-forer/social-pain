// Hacker News via the Algolia search API. Free, no key, instant.
// https://hn.algolia.com/api

import { painScore, timeWindowStart, type PainPoint } from "@/lib/pain-points";

const SEARCH_URL = "https://hn.algolia.com/api/v1/search";

interface HnHit {
  objectID: string;
  title?: string | null;
  story_title?: string | null;
  story_text?: string | null;
  comment_text?: string | null;
  url?: string | null;
  author: string;
  points?: number | null;
  num_comments?: number | null;
  created_at_i: number;
  story_id?: number | null;
  _tags: string[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .trim();
}

function toPainPoint(hit: HnHit): PainPoint | null {
  const isComment = hit._tags.includes("comment");
  const body = stripHtml(hit.comment_text || hit.story_text || "");
  const title = isComment ? `Re: ${hit.story_title || "untitled thread"}` : hit.title || "";

  if (!title) return null;

  const hnUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;

  return {
    id: `hn-${hit.objectID}`,
    title,
    selftext: body,
    subreddit: "Hacker News",
    score: hit.points ?? 0,
    permalink: hnUrl,
    url: hnUrl,
    created_utc: hit.created_at_i,
    num_comments: hit.num_comments ?? 0,
    type: isComment ? "comment" : "post",
    source: "hn",
  };
}

export async function searchHackerNews(query: string, time: string): Promise<PainPoint[]> {
  const params = new URLSearchParams({
    query,
    tags: "(story,comment)",
    hitsPerPage: "60",
  });

  const since = timeWindowStart(time);
  if (since) params.set("numericFilters", `created_at_i>${since}`);

  const response = await fetch(`${SEARCH_URL}?${params}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HN Algolia returned ${response.status}`);
  }

  const json = await response.json();
  const hits: HnHit[] = json.hits || [];

  // Algolia matches on keywords only, so rank pain language above raw engagement
  return hits
    .map(toPainPoint)
    .filter((p): p is PainPoint => p !== null && p.selftext.length > 40)
    .sort((a, b) => {
      const pain = painScore(b.title + " " + b.selftext) - painScore(a.title + " " + a.selftext);
      if (pain !== 0) return pain;
      return b.score + b.num_comments - (a.score + a.num_comments);
    })
    .slice(0, 25);
}
