# social-pain

A local web app that finds people describing their problems in public. Type an audience or topic, pick Reddit, Hacker News or Twitter, and it returns the posts where people complain or admit they're stuck, in their own words, with a link back to each one.

I use it before writing content or an offer, to check that a problem is real and to hear how the people who have it actually talk about it. A Twitter search for "small business owner overwhelmed" turned up a post describing the path most owners take: do everything yourself, get overwhelmed, then hire.

## What it does

- Searches Reddit (all of it, or the subreddits you list), Hacker News, or Twitter, over the past week, month, year or all time.
- Keeps the posts that read like someone describing a problem, using a short list of phrases such as "struggling", "takes forever", "how do you" and "burnt out". The search engine's relevance order is kept, so a long off-topic rant can't jump the queue just because it's angry.
- On Hacker News it ranks Ask HN and Tell HN threads first, since that's where people describe problems, and drops the monthly hiring threads.
- Lets you save the good ones to a panel, stored in a local JSON file.

## How it works

The browser calls one route, `/api/search?source=reddit|hn|twitter`. Each source lives in its own module under `src/lib/sources/` and maps its results onto one `PainPoint` shape, so the UI never needs to know where a post came from.

- Hacker News uses the public Algolia API. It's free and answers in about a second, with no key needed.
- Reddit runs an Apify scraper, because Reddit would not register an API app for this account. The scraper reads one post page at a time, so a search takes about three and a half minutes and costs roughly $0.14.
- Twitter runs a pay-per-result Apify scraper. A search takes under a minute and costs about $0.025.

Apify runs take longer than Node's `fetch` will hold a connection open, so `src/lib/apify.ts` starts a run, polls its status every five seconds, then reads the dataset. If the run outlives its deadline, the code aborts it on Apify so it stops spending credit. A run that times out after storing results still counts, since the scrapers write items as they go.

## Run it

You need Node 20 or newer and, for Reddit and Twitter, an Apify account. The free plan includes $5 of credit a month, which covers about 35 Reddit searches or a couple of hundred Twitter searches.

```bash
git clone https://github.com/david-forer/social-pain.git
cd social-pain
npm install
cp .env.example .env.local   # then paste your APIFY_TOKEN
npm run dev
```

Open http://127.0.0.1:3000. Hacker News works without a token.

## Keep it local

This is a single-user tool for your own machine, and the scripts bind to `127.0.0.1` for that reason. The search route has no login, and every Reddit or Twitter search spends your Apify credit, so anyone who could reach a public deployment could run up your bill. Saved items also go to a file on disk, which serverless hosting either blocks or throws away between requests. If you want to host it, add authentication and rate limiting to `/api/search` and move saves to a database first.

## Stack

Next.js 16 (App Router), React 19, TypeScript in strict mode, Tailwind CSS 4, and lucide-react for icons.

## License

MIT
