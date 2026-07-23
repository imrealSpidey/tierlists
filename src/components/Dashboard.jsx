import React from 'react';
import { Layers, Clock, Settings, Sparkles, Plus, Globe, Lock, Image as ImageIcon } from 'lucide-react';

export default function Dashboard({ tierLists, user, activeGuildId, onCreateNew, onSelectList }) {
  const lists = Object.values(tierLists).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  
  const myLists = lists.filter(l => l.creatorId === user?.id);
  const communityLists = lists.filter(l => l.creatorId !== user?.id && l.mode !== 'personal');

  const renderGrid = (listItems, isCommunity) => {
    if (listItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 glass-panel border-dashed border-2 border-slate-800/50 rounded-2xl text-center">
          <Sparkles className="w-6 h-6 text-slate-600 mb-2" />
          <p className="text-sm text-slate-500">Nothing to show here yet.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {listItems.map((list) => {
          const isLive = list.mode !== 'personal';
          const dateStr = list.createdAt 
            ? new Date(list.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Unknown Date';

          return (
            <div 
              key={list.id}
              onClick={() => onSelectList(list.id)}
              className="glass-panel p-5 rounded-2xl hover:border-pink-500/50 transition cursor-pointer flex flex-col group hover:shadow-lg hover:shadow-pink-900/10 relative overflow-hidden"
            >
              {isCommunity && (
                <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition z-0">
                  <img 
                    src={`/api/guilds/${activeGuildId}/tierlists/${list.id}/image.png`} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1.5 ${isLive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                    {isLive ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {isLive ? 'Live Voting' : 'Personal'}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1 bg-slate-900/50 px-2 py-1 rounded">
                    <Clock className="w-3 h-3" />
                    {dateStr}
                  </div>
                </div>

                <h3 className="text-lg font-black text-white group-hover:text-pink-400 transition line-clamp-1 mb-1 shadow-black drop-shadow-md">
                  {list.title || 'Untitled'}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2 min-h-[32px] mb-4 shadow-black drop-shadow-md">
                  {list.subtitle || 'No description provided.'}
                </p>

                <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-center justify-between text-xs font-semibold text-slate-200">
                  <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded">
                    <Layers className="w-4 h-4 text-slate-400" />
                    {list.items?.length || 0} Items
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition">
                    {isCommunity ? <ImageIcon className="w-3.5 h-3.5 text-pink-400" /> : <Settings className="w-3.5 h-3.5 text-blue-400" />}
                    {isCommunity ? 'View & Vote' : 'Edit Board'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-10 animate-fade-in pb-12">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-pink-400" />
            Tier List Hub
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage your personal boards and participate in community voting.
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition shadow-lg shadow-pink-600/20 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Create New Tier List
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <Settings className="w-5 h-5 text-blue-400" />
          My Tier Lists
        </h3>
        {renderGrid(myLists, false)}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <Globe className="w-5 h-5 text-green-400" />
          Community Tier Lists
        </h3>
        <p className="text-xs text-slate-400 -mt-2 mb-2">Tier lists created by other members of this Discord server.</p>
        {renderGrid(communityLists, true)}
      </div>
    </div>
  );
}
