// Twitter/X via an Apify actor. The store listing says free accounts are
// capped, but in practice a 100-tweet run on the free plan costs about $0.025
// and finishes in under a minute.

import { runApifyActor } from "@/lib/apify";
import { painScore, timeWindowStart, type PainPoint } from "@/lib/pain-points";

const ACTOR_ID = "kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest";
const RUN_TIMEOUT_SECS = 200;
const MAX_ITEMS = 100;

// Twitter advanced search: drop retweets and replies so results are original complaints
const QUERY_SUFFIX = "-filter:retweets -filter:replies lang:en";

interface ApifyTweet {
  id: string;
  url?: string;
  twitterUrl?: string;
  text?: string;
  fullText?: string;
  createdAt?: string;
  likeCount?: number;
  replyCount?: number;
  retweetCount?: number;
  author?: { userName?: string };
}

function toPainPoint(tweet: ApifyTweet): PainPoint | null {
  const text = (tweet.fullText || tweet.text || "").trim();
  if (!text) return null;

  const url = tweet.url || tweet.twitterUrl || "";
  const createdMs = tweet.createdAt ? Date.parse(tweet.createdAt) : NaN;
  const firstLine = text.split("\n")[0];

  return {
    id: `tw-${tweet.id}`,
    title: firstLine.length > 90 ? firstLine.slice(0, 87) + "..." : firstLine,
    selftext: text,
    subreddit: tweet.author?.userName || "unknown",
    score: tweet.likeCount ?? 0,
    permalink: url,
    url,
    created_utc: Number.isNaN(createdMs) ? Math.floor(Date.now() / 1000) : Math.floor(createdMs / 1000),
    num_comments: tweet.replyCount ?? 0,
    type: "post",
    source: "twitter",
  };
}

export async function searchTwitter(query: string, time: string): Promise<PainPoint[]> {
  const input: Record<string, unknown> = {
    searchTerms: [`${query} ${QUERY_SUFFIX}`],
    maxItems: MAX_ITEMS,
    queryType: "Top",
  };

  const since = timeWindowStart(time);
  // The actor wants the unix timestamp as a string
  if (since) input.since_time = String(since);

  const tweets = await runApifyActor<ApifyTweet>(ACTOR_ID, input, RUN_TIMEOUT_SECS);

  return tweets
    .map(toPainPoint)
    .filter((p): p is PainPoint => p !== null)
    .sort((a, b) => {
      const pain = painScore(b.selftext) - painScore(a.selftext);
      if (pain !== 0) return pain;
      return b.score + b.num_comments - (a.score + a.num_comments);
    })
    .slice(0, 25);
}
