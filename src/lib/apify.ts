// Generic Apify runner. Actors here take minutes, longer than Node's fetch will
// hold a single connection, so a run is started, polled, then its dataset read.
// A TIMED-OUT run that already stored items counts as a result, since the
// scrapers stream items into the dataset as they go.

const API = "https://api.apify.com/v2";
const POLL_INTERVAL_MS = 5_000;

export class ApifyConfigError extends Error {}

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

export async function runApifyActor<T>(actorId: string, input: unknown, timeoutSecs: number): Promise<T[]> {
  const token = getToken();

  const started = await apifyJson(`/acts/${actorId}/runs?timeout=${timeoutSecs}`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const runId: string = started.data.id;
  const datasetId: string = started.data.defaultDatasetId;
  const deadline = Date.now() + (timeoutSecs + 30) * 1000;

  let status: string = started.data.status;
  while (["READY", "RUNNING"].includes(status)) {
    if (Date.now() > deadline) {
      throw new Error(`Apify run ${runId} did not finish within ${timeoutSecs}s`);
    }
    await sleep(POLL_INTERVAL_MS);
    const run = await apifyJson(`/actor-runs/${runId}`, token);
    status = run.data.status;
  }

  if (status !== "SUCCEEDED" && status !== "TIMED-OUT") {
    throw new Error(`Apify run ${runId} ended with status ${status}`);
  }

  const items = await apifyJson(`/datasets/${datasetId}/items?format=json&clean=true`, token);
  const list: T[] = Array.isArray(items) ? items : [];

  if (status === "TIMED-OUT" && list.length === 0) {
    throw new Error(`Apify run ${runId} timed out before storing any items`);
  }

  return list;
}
