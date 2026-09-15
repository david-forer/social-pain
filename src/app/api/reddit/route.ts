import { NextResponse } from 'next/server';
import { searchRedditViaApify, ApifyConfigError, ApifyRedditItem } from '@/lib/apify';
import type { PainPoint } from '@/lib/pain-points';

// Apify runs take up to a couple of minutes, so lift the default route timeout
export const maxDuration = 300;

// Reddit search returns nothing for niche topics if this gets too long
const PAIN_KEYWORDS =
  'struggling OR overwhelmed OR frustrated OR "how do you" OR "wasting time" OR "takes forever" OR "so annoying" OR "can\'t keep up" OR "not working" OR "total mess"';

function toPainPoint(item: ApifyRedditItem): PainPoint | null {
  if (!item.title) return null;

  // Actor returns full URLs; the cards prepend reddit.com to a permalink path
  let permalink = item.url;
  try {
    permalink = new URL(item.url).pathname;
  } catch {
    // leave as-is if the actor ever hands back a bare path
  }

  const createdMs = item.createdAt ? Date.parse(item.createdAt) : NaN;

  return {
    id: item.parsedId || item.id,
    title: item.title,
    selftext: item.body || '',
    subreddit: item.parsedCommunityName || (item.communityName || '').replace(/^r\//, ''),
    score: item.upVotes ?? 0,
    permalink,
    created_utc: Number.isNaN(createdMs) ? Math.floor(Date.now() / 1000) : Math.floor(createdMs / 1000),
    num_comments: item.numberOfComments ?? 0,
    type: 'post',
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const subreddits = searchParams.get('subreddits');
  const time = searchParams.get('time') || 'year';

  if (!q) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const srList = (subreddits || '')
      .split(',')
      .map((s) => s.trim().replace(/^r\//, ''))
      .filter(Boolean);

    // The actor scrapes ~20 posts per 200s run, asking for more just costs money
    const items = await searchRedditViaApify({
      query: `${q} (${PAIN_KEYWORDS})`,
      subreddits: srList,
      time,
      maxItems: 30,
    });

    const painPoints = items
      .filter((item) => !item.dataType || item.dataType === 'post')
      .map(toPainPoint)
      .filter((p): p is PainPoint => p !== null && p.score > -10)
      .sort((a, b) => (b.score + b.num_comments) - (a.score + a.num_comments))
      .slice(0, 25);

    return NextResponse.json({ painPoints });
  } catch (error) {
    console.error('Reddit search API error:', error);

    if (error instanceof ApifyConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json({ error: 'Failed to fetch discussions from Reddit' }, { status: 500 });
  }
}
