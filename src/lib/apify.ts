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

async function apifyJson(path: string, token: string, init?: RequestInit): Promise<unknown> {
  const sep = path.includes("?") ? "&" : "?";
  const response = await fetch(`${API}${path}${sep}token=${token}`, { ...init, cache: "no-store" });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Apify ${path.split("?")[0]} returned ${response.status}: ${detail.slice(0, 300)}`);
  }
  return response.json();
}

interface ApifyRun {
  id: string;
  status: string;
  defaultDatasetId: string;
}

// Narrow the { data: run } envelope so a changed or error-shaped response fails
// with a clear message instead of a property read deep inside the poll loop.
function toRun(body: unknown): ApifyRun {
  const data = (body as { data?: Partial<ApifyRun> } | null)?.data;
  if (!data || typeof data.id !== "string" || typeof data.status !== "string" || typeof data.defaultDatasetId !== "string") {
    throw new Error("Apify returned a run response in an unexpected shape");
  }
  return data as ApifyRun;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runApifyActor<T>(actorId: string, input: unknown, timeoutSecs: number): Promise<T[]> {
  const token = getToken();

  const started = toRun(
    await apifyJson(`/acts/${actorId}/runs?timeout=${timeoutSecs}`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );

  const runId = started.id;
  const datasetId = started.defaultDatasetId;
  const deadline = Date.now() + (timeoutSecs + 30) * 1000;

  let status = started.status;
  while (["READY", "RUNNING"].includes(status)) {
    if (Date.now() > deadline) {
      // Stop the paid run instead of letting it burn credit after we give up
      await apifyJson(`/actor-runs/${runId}/abort`, token, { method: "POST" }).catch(() => undefined);
      throw new Error(`Apify run ${runId} did not finish within ${timeoutSecs}s`);
    }
    await sleep(POLL_INTERVAL_MS);
    // One retry, so a single dropped status check does not kill a run that is still going
    const run = await apifyJson(`/actor-runs/${runId}`, token).catch(async () => {
      await sleep(POLL_INTERVAL_MS);
      return apifyJson(`/actor-runs/${runId}`, token);
    });
    status = toRun(run).status;
  }

  if (status !== "SUCCEEDED" && status !== "TIMED-OUT") {
    throw new Error(`Apify run ${runId} ended with status ${status}`);
  }

  const items = await apifyJson(`/datasets/${datasetId}/items?format=json&clean=true`, token);
  const list: T[] = Array.isArray(items) ? (items as T[]) : [];

  if (status === "TIMED-OUT" && list.length === 0) {
    throw new Error(`Apify run ${runId} timed out before storing any items`);
  }

  return list;
}
