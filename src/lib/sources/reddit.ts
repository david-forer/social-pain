// Reddit via the Apify "Reddit Scraper Lite" actor. Reddit would not let us
// register an API app, so this is the only route in. The actor visits one post
// page at a time (~9s each), so a 200s run yields around 20 posts. Comments come
// from the same post page, and they are where the most specific answers live.

import { runApifyActor } from "@/lib/apify";
import type { PainPoint } from "@/lib/pain-points";

const ACTOR_ID = "trudax~reddit-scraper-lite";
const RUN_TIMEOUT_SECS = 200;
// The actor scrapes ~20 posts per run at this timeout, asking for more just costs money
const MAX_POSTS = 30;
// Top comments kept per post. The actor bills per item, so this is the cost dial.
const COMMENTS_PER_POST = 8;
const MAX_ITEMS = MAX_POSTS * (COMMENTS_PER_POST + 1);
// One-line replies and removed comments carry no usable detail
const MIN_COMMENT_LENGTH = 40;

// Reddit search returns nothing for niche topics if this gets too long
const PAIN_KEYWORDS =
  'struggling OR overwhelmed OR frustrated OR "how do you" OR "wasting time" OR "takes forever" OR "so annoying" OR "can\'t keep up" OR "not working" OR "total mess"';

interface ApifyRedditItem {
  id: string;
  parsedId?: string;
  url: string;
  postId?: string;
  parentId?: string;
  username?: string;
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
    maxPostCount: MAX_POSTS,
    skipComments: false,
    maxComments: COMMENTS_PER_POST,
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
      maxPostCount: Math.max(3, Math.ceil(MAX_POSTS / subreddits.length)),
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

function permalinkOf(url: string): string {
  // Actor returns full URLs; the cards prepend reddit.com to a permalink path
  try {
    return new URL(url).pathname;
  } catch {
    // leave as-is if the actor ever hands back a bare path
    return url;
  }
}

function toUnixSeconds(createdAt?: string): number {
  const createdMs = createdAt ? Date.parse(createdAt) : NaN;
  return Number.isNaN(createdMs) ? Math.floor(Date.now() / 1000) : Math.floor(createdMs / 1000);
}

function subredditOf(item: ApifyRedditItem): string {
  return item.parsedCommunityName || (item.communityName || "").replace(/^r\//, "");
}

function toPainPoint(item: ApifyRedditItem): PainPoint | null {
  if (!item.title) return null;

  return {
    id: item.parsedId || item.id,
    title: item.title,
    selftext: item.body || "",
    subreddit: subredditOf(item),
    score: item.upVotes ?? 0,
    permalink: permalinkOf(item.url),
    url: item.url,
    created_utc: toUnixSeconds(item.createdAt),
    num_comments: item.numberOfComments ?? 0,
    type: "post",
    source: "reddit",
    author: item.username,
  };
}

// Comments carry the parent post's title so a card or CSV row reads in context
function toCommentPainPoint(item: ApifyRedditItem, post: PainPoint): PainPoint | null {
  const body = (item.body || "").trim();
  if (body.length < MIN_COMMENT_LENGTH || body === "[deleted]" || body === "[removed]") return null;

  return {
    id: item.parsedId || item.id,
    title: post.title,
    selftext: body,
    subreddit: subredditOf(item) || post.subreddit,
    score: item.upVotes ?? 0,
    permalink: permalinkOf(item.url),
    url: item.url,
    created_utc: toUnixSeconds(item.createdAt),
    num_comments: 0,
    type: "comment",
    source: "reddit",
    author: item.username,
    parent_id: post.id,
  };
}

// Strip Reddit's type prefix so "t3_abc" and "abc" match
function bareId(id?: string): string {
  return (id || "").replace(/^t\d_/, "");
}

export async function searchReddit(params: RedditSearchParams): Promise<PainPoint[]> {
  const items = await runApifyActor<ApifyRedditItem>(ACTOR_ID, buildActorInput(params), RUN_TIMEOUT_SECS);

  const posts = items
    .filter((item) => !item.dataType || item.dataType === "post")
    .map(toPainPoint)
    .filter((p): p is PainPoint => p !== null && p.score > -10)
    .sort((a, b) => b.score + b.num_comments - (a.score + a.num_comments))
    .slice(0, 25);

  const postsById = new Map(posts.map((p) => [bareId(p.id), p]));
  const commentsByPost = new Map<string, PainPoint[]>();
  for (const item of items) {
    if (item.dataType !== "comment") continue;
    const post = postsById.get(bareId(item.postId));
    if (!post) continue;
    const comment = toCommentPainPoint(item, post);
    if (!comment) continue;
    const list = commentsByPost.get(post.id) ?? [];
    list.push(comment);
    commentsByPost.set(post.id, list);
  }

  // Each post is followed by its highest-voted comments
  return posts.flatMap((post) => [
    post,
    ...(commentsByPost.get(post.id) ?? []).sort((a, b) => b.score - a.score).slice(0, COMMENTS_PER_POST),
  ]);
}
