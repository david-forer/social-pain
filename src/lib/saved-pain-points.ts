import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PainPoint } from "@/lib/pain-points";

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

export async function savePainPoint(painPoint: PainPoint): Promise<PainPoint[]> {
  const saved = await getSavedPainPoints();

  if (saved.some((item) => item.id === painPoint.id)) {
    return saved;
  }

  const next = [painPoint, ...saved];
  await writeFile(storagePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function removePainPoint(id: string): Promise<PainPoint[]> {
  const saved = await getSavedPainPoints();
  const next = saved.filter((item) => item.id !== id);
  await writeFile(storagePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}
