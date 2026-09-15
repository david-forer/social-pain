"use client";

import { useState, useEffect } from "react";
import SearchHero from "@/components/SearchHero";
import PainPointCard from "@/components/PainPointCard";
import SavedPanel from "@/components/SavedPanel";
import { AlertCircle, Bookmark } from "lucide-react";
import { PainPoint, PainSource } from "@/lib/pain-points";

type Tab = "results" | "saved";

export default function Home() {
  const [query, setQuery] = useState("");
  const [subreddits, setSubreddits] = useState("smallbusiness,Entrepreneur,startups,SaaS,solopreneur,agency");
  const [time, setTime] = useState("year");
  const [source, setSource] = useState<PainSource>("reddit");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<PainPoint[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<PainPoint[]>([]);
  const [tab, setTab] = useState<Tab>("results");

  useEffect(() => {
    const loadSaved = async () => {
      try {
        const response = await fetch("/api/saved");
        if (!response.ok) throw new Error("Failed to load saved threads.");
        const data = await response.json();
        setSaved(data.saved || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load saved threads.");
      }
    };

    void loadSaved();
  }, []);

  const handleSave = async (p: PainPoint) => {
    if (saved.find((s) => s.id === p.id)) return;

    try {
      const response = await fetch("/api/saved", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(p),
      });

      if (!response.ok) throw new Error("Failed to save thread.");
      const data = await response.json();
      setSaved(data.saved || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save thread.");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const response = await fetch(`/api/saved?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove thread.");
      const data = await response.json();
      setSaved(data.saved || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove thread.");
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    setResults([]);
    setTab("results");

    try {
      const params = new URLSearchParams({ q: query, time, source });
      if (source === "reddit" && subreddits.trim()) params.set("subreddits", subreddits.trim());

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch pain points. Please try again.");
      }

      setResults(data.painPoints || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 font-sans selection:bg-indigo-500/30">
      <main className="container mx-auto px-4 w-full flex flex-col items-center">
        <SearchHero
          query={query}
          setQuery={setQuery}
          subreddits={subreddits}
          setSubreddits={setSubreddits}
          time={time}
          setTime={setTime}
          source={source}
          setSource={setSource}
          onSearch={handleSearch}
          isLoading={isSearching}
        />

        <div className="w-full max-w-7xl pb-24">
          {/* Tab bar */}
          <div className="flex items-center gap-2 mb-8">
            <button
              onClick={() => setTab("results")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tab === "results"
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/10"
              }`}
            >
              Results {results.length > 0 && `(${results.length})`}
            </button>
            <button
              onClick={() => setTab("saved")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tab === "saved"
                  ? "bg-indigo-500 text-white"
                  : "text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/10"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              Saved {saved.length > 0 && `(${saved.length})`}
            </button>
          </div>

          {error && (
            <div className="glass-card bg-red-500/10 border-red-500/20 max-w-2xl mx-auto p-4 flex items-center gap-3 text-red-400 mb-8 rounded-xl">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {tab === "saved" && (
            <SavedPanel saved={saved} onRemove={handleRemove} />
          )}

          {tab === "results" && (
            <>
              {isSearching && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="glass-card h-[300px] rounded-2xl p-6 flex flex-col gap-4">
                      <div className="flex justify-between">
                        <div className="h-6 w-24 bg-zinc-800 rounded-full"></div>
                        <div className="h-6 w-16 bg-zinc-800 rounded-full"></div>
                      </div>
                      <div className="h-6 w-3/4 bg-zinc-800 rounded-lg mt-2"></div>
                      <div className="space-y-2 mt-4 flex-grow">
                        <div className="h-4 w-full bg-zinc-800 rounded"></div>
                        <div className="h-4 w-full bg-zinc-800 rounded"></div>
                        <div className="h-4 w-2/3 bg-zinc-800 rounded"></div>
                      </div>
                      <div className="flex justify-between mt-auto pt-4 border-t border-white/5">
                        <div className="flex gap-4">
                          <div className="h-8 w-12 bg-zinc-800 rounded-lg"></div>
                          <div className="h-8 w-12 bg-zinc-800 rounded-lg"></div>
                        </div>
                        <div className="h-8 w-24 bg-zinc-800 rounded-lg"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isSearching && hasSearched && results.length === 0 && !error && (
                <div className="text-center py-24 glass-panel rounded-2xl max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold mb-2">No pain points found</h2>
                  <p className="text-zinc-400">Try broadening your search or adjusting the time range.</p>
                </div>
              )}

              {!isSearching && results.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      Found <span className="text-indigo-400">{results.length}</span> Pain Points
                    </h2>
                    <div className="px-3 py-1 bg-zinc-900 rounded-full border border-white/10 text-sm text-zinc-400">
                      Sorted by Relevance & Intensity
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map((painPoint) => (
                      <PainPointCard
                        key={painPoint.id}
                        painPoint={painPoint}
                        isSaved={!!saved.find((s) => s.id === painPoint.id)}
                        onSave={handleSave}
                        onRemove={handleRemove}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
