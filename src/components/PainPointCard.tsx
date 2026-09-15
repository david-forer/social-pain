"use client";

import { MessageSquare, ExternalLink, ThumbsUp, Calendar, Bookmark } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PainPoint, painPointUrl, painPointOrigin, painPointSourceLabel } from "@/lib/pain-points";

interface PainPointCardProps {
  painPoint: PainPoint;
  isSaved: boolean;
  onSave: (p: PainPoint) => void;
  onRemove: (id: string) => void;
}

export default function PainPointCard({ painPoint, isSaved, onSave, onRemove }: PainPointCardProps) {
  const url = painPointUrl(painPoint);
  const date = new Date(painPoint.created_utc * 1000);

  const truncate = (str: string, length: number) => {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
  };

  return (
    <div className="glass-card flex flex-col p-6 rounded-2xl h-full relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500/0 via-purple-500/50 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>

      <div className="flex items-center justify-between mb-4 text-xs font-medium text-zinc-400">
        <span className="flex items-center gap-1.5 bg-zinc-800/50 px-3 py-1 rounded-full border border-zinc-700/50">
          <MessageSquare className="w-3.5 h-3.5" />
          {painPointOrigin(painPoint)}
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
          <button
            onClick={() => isSaved ? onRemove(painPoint.id) : onSave(painPoint)}
            title={isSaved ? "Remove bookmark" : "Save thread"}
            className={`p-1 rounded-md transition-colors ${isSaved ? 'text-indigo-400 hover:text-indigo-300' : 'text-zinc-600 hover:text-indigo-400'}`}
          >
            <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-zinc-100 mb-3 leading-snug">
        {painPoint.title}
      </h3>

      <div className="text-zinc-400 text-sm mb-6 flex-grow leading-relaxed">
        {painPoint.selftext ? truncate(painPoint.selftext, 200) : <span className="italic text-zinc-600">No description provided</span>}
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
        <div className="flex items-center gap-4 text-sm font-medium text-zinc-300">
          <div className="flex items-center gap-1.5">
            <ThumbsUp className="w-4 h-4 text-pink-500" />
            {painPoint.score}
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            {painPoint.num_comments}
          </div>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg hover:bg-white/10"
        >
          View on {painPointSourceLabel(painPoint)}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
