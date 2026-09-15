"use client";

import { Search, Loader2 } from "lucide-react";

const TIME_OPTIONS = [
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "year", label: "Past year" },
  { value: "all", label: "All time" },
];

interface SearchHeroProps {
  query: string;
  setQuery: (q: string) => void;
  subreddits: string;
  setSubreddits: (s: string) => void;
  time: string;
  setTime: (t: string) => void;
  onSearch: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export default function SearchHero({
  query,
  setQuery,
  subreddits,
  setSubreddits,
  time,
  setTime,
  onSearch,
  isLoading,
}: SearchHeroProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-20 px-6">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
        </span>
        Live Reddit Analyzer
      </div>

      <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-center mb-6 max-w-4xl">
        Discover Real <span className="text-gradient">Customer Pain</span> Points
      </h1>

      <p className="text-lg md:text-xl text-zinc-400 text-center max-w-2xl mb-12">
        Type an audience or topic to uncover what they really struggle with on Reddit.
      </p>

      <form onSubmit={onSearch} className="w-full max-w-2xl flex flex-col gap-3">
        {/* Main search bar */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex items-center w-full h-16 rounded-full glass-panel overflow-hidden px-2">
            <div className="flex items-center justify-center pl-4 pr-2">
              <Search className="w-6 h-6 text-zinc-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Software Engineers, SaaS founders..."
              className="flex-1 h-full bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-500 text-lg px-2"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="flex items-center justify-center h-12 px-6 rounded-full bg-zinc-100 text-zinc-900 font-semibold transition-all hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze"}
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex gap-3 items-center">
          <div className="flex-1 flex items-center gap-2 h-10 rounded-full glass-panel px-4 overflow-hidden">
            <span className="text-zinc-500 text-xs font-medium shrink-0">r/</span>
            <input
              type="text"
              value={subreddits}
              onChange={(e) => setSubreddits(e.target.value)}
              placeholder="entrepreneur, SaaS, startups..."
              className="flex-1 bg-transparent border-none outline-none text-zinc-300 placeholder:text-zinc-600 text-sm min-w-0"
            />
          </div>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-10 rounded-full glass-panel bg-zinc-900 border-none outline-none text-zinc-300 text-sm px-4 cursor-pointer shrink-0"
          >
            {TIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </form>
    </div>
  );
}
