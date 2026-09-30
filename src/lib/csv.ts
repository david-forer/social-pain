import { PainPoint, painPointUrl, painPointOrigin, painPointSourceLabel } from "@/lib/pain-points";

const COLUMNS = ["source", "type", "origin", "author", "title", "text", "score", "comments", "created", "url", "status"];

// Quote every field so commas, quotes and line breaks in posts survive
function cell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function painPointsToCsv(points: PainPoint[]): string {
  const rows = points.map((p) =>
    [
      painPointSourceLabel(p),
      p.type,
      painPointOrigin(p),
      p.author ?? "",
      p.title,
      p.selftext,
      p.score,
      p.num_comments,
      new Date(p.created_utc * 1000).toISOString().slice(0, 10),
      painPointUrl(p),
      // Blank on purpose: a column to work the list in a spreadsheet
      "",
    ]
      .map(cell)
      .join(",")
  );
  return [COLUMNS.join(","), ...rows].join("\r\n");
}

export function downloadCsv(points: PainPoint[], label: string) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "results";
  const date = new Date().toISOString().slice(0, 10);
  // The byte order mark makes Excel open the file as UTF-8
  const blob = new Blob(["﻿" + painPointsToCsv(points)], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `socialpain-${slug}-${date}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
