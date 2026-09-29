// Reddit via the Apify "Reddit Scraper Lite" actor. Reddit would not let us
// register an API app, so this is the only route in. The actor visits one post
// page at a time (~9s each), so a 200s run yields around 20 posts.

import { runApifyActor } from "@/lib/apify";
import type { PainPoint } from "@/lib/pain-points";

const ACTOR_ID = "trudax~reddit-scraper-lite";
const RUN_TIMEOUT_SECS = 200;
// The actor scrapes ~20 posts per run at this timeout, asking for more just costs money
const MAX_ITEMS = 30;

// Reddit search returns nothing for niche topics if this gets too long
const PAIN_KEYWORDS =
  'struggling OR overwhelmed OR frustrated OR "how do you" OR "wasting time" OR "takes forever" OR "so annoying" OR "can\'t keep up" OR "not working" OR "total mess"';

interface ApifyRedditItem {
  id: string;
  parsedId?: string;
  url: string;
  title?: string;
  body?: string;
  communityName?: string;
  parsedCommunityName?: string;
  upVotes?: number;
  numberOfComments?: number;
  createdAt?: string;
  dataType?: string;
}

export interface RedditSearchParams {
  query: string;
  subreddits: string[];
  time: string;
}

function buildActorInput({ query, subreddits, time }: RedditSearchParams) {
  const searchTerms = `${query} (${PAIN_KEYWORDS})`;

  const common = {
    maxItems: MAX_ITEMS,
    maxPostCount: MAX_ITEMS,
    skipComments: true,
    includeNSFW: false,
    // upVotes and numberOfComments only come back when this is on
    includeMediaLinks: true,
    proxy: { useApifyProxy: true },
  };

  // The actor's search fields only take one community and a multireddit
  // (r/a+b) search URL yields nothing, so each subreddit gets its own search
  // page. maxPostCount is per page, so it is split to spread results across subs.
  if (subreddits.length > 0) {
    return {
      ...common,
      maxPostCount: Math.max(3, Math.ceil(MAX_ITEMS / subreddits.length)),
      startUrls: subreddits.map((sr) => ({
        url: `https://www.reddit.com/r/${encodeURIComponent(sr)}/search/?q=${encodeURIComponent(searchTerms)}&restrict_sr=1&sort=relevance&t=${time}`,
      })),
    };
  }

  return {
    ...common,
    searches: [searchTerms],
    searchPosts: true,
    searchComments: false,
    searchCommunities: false,
    searchUsers: false,
    searchMedia: false,
    sort: "relevance",
    time,
  };
}

function toPainPoint(item: ApifyRedditItem): PainPoint | null {
  if (!item.title) return null;

  // Actor returns full URLs; the cards prepend reddit.com to a permalink path
  let permalink = item.url;
  try {
    permalink = new URL(item.url).pathname;
  } catch {
    // leave as-is if the actor ever hands back a bare path
  }

  const createdMs = item.createdAt ? Date.parse(item.createdAt) : NaN;

  return {
    id: item.parsedId || item.id,
    title: item.title,
    selftext: item.body || "",
    subreddit: item.parsedCommunityName || (item.communityName || "").replace(/^r\//, ""),
    score: item.upVotes ?? 0,
    permalink,
    url: item.url,
    created_utc: Number.isNaN(createdMs) ? Math.floor(Date.now() / 1000) : Math.floor(createdMs / 1000),
    num_comments: item.numberOfComments ?? 0,
    type: "post",
    source: "reddit",
  };
}

export async function searchReddit(params: RedditSearchParams): Promise<PainPoint[]> {
  const items = await runApifyActor<ApifyRedditItem>(ACTOR_ID, buildActorInput(params), RUN_TIMEOUT_SECS);

  return items
    .filter((item) => !item.dataType || item.dataType === "post")
    .map(toPainPoint)
    .filter((p): p is PainPoint => p !== null && p.score > -10)
    .sort((a, b) => b.score + b.num_comments - (a.score + a.num_comments))
    .slice(0, 25);
}
