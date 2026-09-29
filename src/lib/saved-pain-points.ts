import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PainPoint } from "@/lib/pain-points";

// Local file storage. This app is meant to run on your own machine. On serverless
// hosting the filesystem is read-only or per-instance, so saves would not persist.

const dataDir = path.join(process.cwd(), "data");
const storagePath = path.join(dataDir, "saved-pain-points.json");

async function ensureStorage() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(storagePath, "utf8");
  } catch {
    await writeFile(storagePath, "[]", "utf8");
  }
}

export async function getSavedPainPoints(): Promise<PainPoint[]> {
  await ensureStorage();

  try {
    const raw = await readFile(storagePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Saves are read-modify-write on one file, so they run one at a time. Without
// this, a double-click or two open tabs can interleave and drop a saved item.
let writeQueue: Promise<unknown> = Promise.resolve();

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(task, task);
  writeQueue = result.catch(() => undefined);
  return result;
}

export function savePainPoint(painPoint: PainPoint): Promise<PainPoint[]> {
  return serialized(async () => {
    const saved = await getSavedPainPoints();

    if (saved.some((item) => item.id === painPoint.id)) {
      return saved;
    }

    const next = [painPoint, ...saved];
    await writeFile(storagePath, JSON.stringify(next, null, 2), "utf8");
    return next;
  });
}

export function removePainPoint(id: string): Promise<PainPoint[]> {
  return serialized(async () => {
    const saved = await getSavedPainPoints();
    const next = saved.filter((item) => item.id !== id);
    await writeFile(storagePath, JSON.stringify(next, null, 2), "utf8");
    return next;
  });
}
