import { NextResponse } from "next/server";
import { ApifyConfigError } from "@/lib/apify";
import { searchReddit } from "@/lib/sources/reddit";
import { searchHackerNews } from "@/lib/sources/hn";
import { searchTwitter } from "@/lib/sources/twitter";
import { isPainSource, isTimeWindow, type PainPoint } from "@/lib/pain-points";

// Apify-backed sources take a few minutes, so lift the default route timeout
export const maxDuration = 300;

// Reddit community names: letters, digits and underscores, up to 21 characters
const SUBREDDIT_NAME = /^[A-Za-z0-9_]{2,21}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const source = searchParams.get("source") || "reddit";
  const time = searchParams.get("time") || "year";

  if (!q) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  if (!isPainSource(source)) {
    return NextResponse.json({ error: `Unknown source "${source}"` }, { status: 400 });
  }

  if (!isTimeWindow(time)) {
    return NextResponse.json({ error: `Unknown time window "${time}"` }, { status: 400 });
  }

  try {
    let painPoints: PainPoint[];

    if (source === "hn") {
      painPoints = await searchHackerNews(q, time);
    } else if (source === "twitter") {
      painPoints = await searchTwitter(q, time);
    } else {
      const subreddits = (searchParams.get("subreddits") || "")
        .split(",")
        .map((s) => s.trim().replace(/^r\//, ""))
        .filter(Boolean);
      const invalid = subreddits.filter((s) => !SUBREDDIT_NAME.test(s));
      if (invalid.length > 0) {
        return NextResponse.json({ error: `Not a subreddit name: ${invalid.join(", ")}` }, { status: 400 });
      }
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
