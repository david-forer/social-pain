import { NextResponse } from "next/server";
import { ApifyConfigError } from "@/lib/apify";
import { searchReddit } from "@/lib/sources/reddit";
import { searchHackerNews } from "@/lib/sources/hn";
import { searchTwitter } from "@/lib/sources/twitter";
import type { PainSource } from "@/lib/pain-points";

// Apify-backed sources take a few minutes, so lift the default route timeout
export const maxDuration = 300;

const SOURCES: PainSource[] = ["reddit", "hn", "twitter"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const source = (searchParams.get("source") || "reddit") as PainSource;
  const time = searchParams.get("time") || "year";

  if (!q) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  if (!SOURCES.includes(source)) {
    return NextResponse.json({ error: `Unknown source "${source}"` }, { status: 400 });
  }

  try {
    let painPoints;

    if (source === "hn") {
      painPoints = await searchHackerNews(q, time);
    } else if (source === "twitter") {
      painPoints = await searchTwitter(q, time);
    } else {
      const subreddits = (searchParams.get("subreddits") || "")
        .split(",")
        .map((s) => s.trim().replace(/^r\//, ""))
        .filter(Boolean);
      painPoints = await searchReddit({ query: q, subreddits, time });
    }

    return NextResponse.json({ painPoints });
  } catch (error) {
    console.error(`${source} search API error:`, error);

    if (error instanceof ApifyConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json({ error: `Failed to fetch discussions from ${source}` }, { status: 500 });
  }
}
