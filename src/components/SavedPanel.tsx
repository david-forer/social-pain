"use client";

import { Bookmark, Trash2, ExternalLink, MessageSquare, ThumbsUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PainPoint, painPointUrl, painPointOrigin } from "@/lib/pain-points";

interface SavedPanelProps {
  saved: PainPoint[];
  onRemove: (id: string) => void;
}

export default function SavedPanel({ saved, onRemove }: SavedPanelProps) {
  if (saved.length === 0) {
    return (
      <div className="text-center py-24 glass-panel rounded-2xl max-w-2xl mx-auto">
        <Bookmark className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">No saved threads yet</h2>
        <p className="text-zinc-400">Hit the bookmark icon on any result to save it here.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-indigo-400" />
          Saved <span className="text-indigo-400">{saved.length}</span> Threads
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {saved.map((p) => {
          const url = painPointUrl(p);
          const date = new Date(p.created_utc * 1000);
          const truncate = (str: string, len: number) =>
            str && str.length > len ? str.substring(0, len) + "..." : str || "";

          return (
            <div key={p.id} className="glass-card flex flex-col p-6 rounded-2xl h-full relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500/0 via-purple-500/50 to-indigo-500/0 opacity-100"></div>

              <div className="flex items-center justify-between mb-4 text-xs font-medium text-zinc-400">
                <span className="flex items-center gap-1.5 bg-zinc-800/50 px-3 py-1 rounded-full border border-zinc-700/50">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {painPointOrigin(p)}
                </span>
                <span className="text-zinc-500">{formatDistanceToNow(date, { addSuffix: true })}</span>
              </div>

              <h3 className="text-xl font-semibold text-zinc-100 mb-3 leading-snug">{p.title}</h3>

              <div className="text-zinc-400 text-sm mb-6 flex-grow leading-relaxed">
                {p.selftext ? truncate(p.selftext, 200) : <span className="italic text-zinc-600">No description</span>}
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                <div className="flex items-center gap-4 text-sm font-medium text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <ThumbsUp className="w-4 h-4 text-pink-500" />
                    {p.score}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    {p.num_comments}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRemove(p.id)}
                    className="flex items-center gap-1 text-sm text-red-400/70 hover:text-red-400 transition-colors bg-red-500/5 px-3 py-1.5 rounded-lg hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg hover:bg-white/10"
                  >
                    View
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
