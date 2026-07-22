import React from 'react';
import { X, Award, BarChart3, Users, History, Vote, TrendingUp } from 'lucide-react';

export default function ItemDetailsDrawer({ item, tierList, onClose, onVote, onDelete, onMoveToUnranked }) {
  if (!item || !tierList) return null;

  const totalVotes = item.totalVotes || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-slide-up">
      <div className="glass-panel w-full max-w-lg p-6 flex flex-col gap-6 relative border-slate-700 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Item Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-4xl shadow-xl border border-slate-700">
            {item.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold text-white">{item.name}</h2>
              <span className="glass-pill px-2.5 py-0.5 text-xs text-cyan-300 font-semibold border border-cyan-500/30">
                {item.category || 'Item'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Currently in Tier <strong className="text-pink-400">{item.currentTier}</strong> • Rated by {totalVotes} voters
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" /> Average Rating
            </span>
            <span className="text-2xl font-black text-amber-300 font-mono">
              ⭐ {(item.averageScore || 0).toFixed(2)} <span className="text-xs text-slate-500 font-normal">/ 5.0</span>
            </span>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-cyan-400" /> Total Votes
            </span>
            <span className="text-2xl font-black text-white font-mono">
              👥 {totalVotes}
            </span>
          </div>
        </div>

        {/* Vote Distribution Bar Chart */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-pink-400" /> Vote Distribution Breakdown
          </h3>

          <div className="flex flex-col gap-2 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            {tierList.tiers.map((tier) => {
              const votesObj = item.votes || {};
              const count = votesObj[tier.id] || 0;
              const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

              return (
                <div key={tier.id} className="flex items-center gap-3">
                  <span
                    style={{ color: tier.color }}
                    className="w-6 font-extrabold text-sm text-right"
                  >
                    {tier.id}
                  </span>

                  <div className="flex-1 bg-slate-950 h-5 rounded-lg overflow-hidden border border-slate-800 relative flex items-center">
                    <div
                      style={{
                        width: `${percent}%`,
                        backgroundColor: tier.color
                      }}
                      className="h-full transition-all duration-500 opacity-80"
                    />
                    <span className="absolute right-2 text-[10px] font-mono font-bold text-slate-300">
                      {count} ({percent}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Vote Actions */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-400">Cast Your Vote:</span>
          <div className="grid grid-cols-6 gap-2">
            {tierList.tiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => {
                  onVote({
                    tierListId: tierList.id,
                    itemId: item.id,
                    itemName: item.name,
                    tier: tier.id,
                    voterName: 'Details Drawer',
                    source: 'Modal'
                  });
                }}
                style={{
                  backgroundColor: tier.bgColor,
                  color: tier.color,
                  borderColor: tier.borderColor
                }}
                className="py-2.5 rounded-xl font-black text-sm border hover:scale-105 transition flex items-center justify-center shadow-md"
              >
                {tier.id}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-2 border-t border-slate-800 pt-4">
          {item.currentTier && (
            <button
              onClick={() => onMoveToUnranked(item.id)}
              className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition"
            >
              Move to Unranked
            </button>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="flex-1 py-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 font-bold text-sm border border-red-500/30 transition flex justify-center items-center gap-2"
          >
            🗑️ Delete Item
          </button>
        </div>
      </div>
    </div>
  );
}
