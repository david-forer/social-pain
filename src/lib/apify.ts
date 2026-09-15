// Reddit blocks app registration for this account, so search runs through the
// Apify "Reddit Scraper Lite" actor instead. The actor visits one post page at
// a time (~9s each) and streams items into its dataset as it goes, so the run
// is started, polled, hard-capped by a timeout, and whatever it stored by then
// is read back. A TIMED-OUT run with items is a normal outcome, not a failure.

const ACTOR_ID = "trudax~reddit-scraper-lite";
const API = "https://api.apify.com/v2";

const RUN_TIMEOUT_SECS = 200;
const POLL_INTERVAL_MS = 5_000;

export class ApifyConfigError extends Error {}

export interface ApifyRedditItem {
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
  over18?: boolean;
}

export interface RedditSearchInput {
  query: string;
  subreddits: string[];
  time: string;
  maxItems: number;
}

function buildActorInput({ query, subreddits, time, maxItems }: RedditSearchInput) {
  const common = {
    maxItems,
    maxPostCount: maxItems,
    skipComments: true,
    includeNSFW: false,
    // upVotes and numberOfComments only come back when this is on
    includeMediaLinks: true,
    proxy: { useApifyProxy: true },
  };

  // The actor's search fields only take one community, so subreddit-scoped
  // searches go in as start URLs, one Reddit search page per subreddit
  if (subreddits.length > 0) {
    return {
      ...common,
      startUrls: subreddits.map((sr) => ({
        url: `https://www.reddit.com/r/${sr}/search/?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance&t=${time}`,
      })),
    };
  }

  return {
    ...common,
    searches: [query],
    searchPosts: true,
    searchComments: false,
    searchCommunities: false,
    searchUsers: false,
    searchMedia: false,
    sort: "relevance",
    time,
  };
}

function getToken(): string {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new ApifyConfigError(
      "Apify token is missing. Add APIFY_TOKEN to .env.local and restart the dev server."
    );
  }
  return token;
}

async function apifyJson(path: string, token: string, init?: RequestInit) {
  const sep = path.includes("?") ? "&" : "?";
  const response = await fetch(`${API}${path}${sep}token=${token}`, { ...init, cache: "no-store" });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Apify ${path.split("?")[0]} returned ${response.status}: ${detail.slice(0, 300)}`);
  }
  return response.json();
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function searchRedditViaApify(input: RedditSearchInput): Promise<ApifyRedditItem[]> {
  const token = getToken();

  const started = await apifyJson(`/acts/${ACTOR_ID}/runs?timeout=${RUN_TIMEOUT_SECS}`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildActorInput(input)),
  });

  const runId: string = started.data.id;
  const datasetId: string = started.data.defaultDatasetId;
  const deadline = Date.now() + (RUN_TIMEOUT_SECS + 30) * 1000;

  let status: string = started.data.status;
  while (["READY", "RUNNING"].includes(status)) {
    if (Date.now() > deadline) {
      throw new Error(`Apify run ${runId} did not finish within ${RUN_TIMEOUT_SECS}s`);
    }
    await sleep(POLL_INTERVAL_MS);
    const run = await apifyJson(`/actor-runs/${runId}`, token);
    status = run.data.status;
  }

  if (status !== "SUCCEEDED" && status !== "TIMED-OUT") {
    throw new Error(`Apify run ${runId} ended with status ${status}`);
  }

  const items = await apifyJson(`/datasets/${datasetId}/items?format=json&clean=true`, token);
  const list: ApifyRedditItem[] = Array.isArray(items) ? items : [];

  if (status === "TIMED-OUT" && list.length === 0) {
    throw new Error(`Apify run ${runId} timed out before storing any posts`);
  }

  return list;
}
