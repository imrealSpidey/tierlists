import React from 'react';
import { Layers, Clock, Settings, Sparkles, Plus, Globe, Lock } from 'lucide-react';

export default function Dashboard({ tierLists, onCreateNew, onSelectList }) {
  const lists = Object.values(tierLists).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-pink-400" />
            Your Tier Lists
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage your personal and live community tier lists here.
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition shadow-lg shadow-pink-600/20"
        >
          <Plus className="w-5 h-5" />
          Create New Tier List
        </button>
      </div>

      {/* Grid of Tier Lists */}
      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 glass-panel border-dashed border-2 border-slate-700 rounded-2xl text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Tier Lists Yet</h3>
          <p className="text-slate-400 max-w-sm mb-6">
            You haven't created any tier lists in this server yet. Get started by creating your first one!
          </p>
          <button
            onClick={onCreateNew}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-2.5 rounded-lg transition"
          >
            Create Tier List
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => {
            const isLive = list.mode !== 'personal';
            const dateStr = list.createdAt 
              ? new Date(list.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Unknown Date';

            return (
              <div 
                key={list.id}
                onClick={() => onSelectList(list.id)}
                className="glass-panel p-5 rounded-2xl hover:border-pink-500/50 transition cursor-pointer flex flex-col group hover:shadow-lg hover:shadow-pink-900/10"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1.5 ${isLive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                    {isLive ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {isLive ? 'Live Voting' : 'Personal'}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {dateStr}
                  </div>
                </div>

                <h3 className="text-lg font-black text-white group-hover:text-pink-400 transition line-clamp-1 mb-1">
                  {list.title || 'Untitled'}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-4">
                  {list.subtitle || 'No description provided.'}
                </p>

                <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-center justify-between text-xs font-semibold text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-slate-500" />
                    {list.items?.length || 0} Items
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-md">
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    Edit Board
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
