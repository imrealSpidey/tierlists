import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';

export default function TierListCreatorModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('General');
  const [mode, setMode] = useState('live');
  const [allowCommunityAddItems, setAllowCommunityAddItems] = useState(true);
  const [enableDiscussion, setEnableDiscussion] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a title.');
      return;
    }

    onCreate({
      title,
      subtitle: subtitle || 'Custom tier list',
      category,
      mode,
      allowCommunityAddItems,
      enableDiscussion,
      items: []
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-slide-up">
      <div className="glass-panel w-full max-w-lg p-6 flex flex-col gap-6 relative border-slate-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <FolderPlus className="w-6 h-6 text-pink-400" />
          <h2 className="text-xl font-extrabold text-white">Create Custom Tier List</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Tier List Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Favorite Fast Food Chains"
              required
              className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Food, Movies, Anime"
              className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Subtitle / Tagline</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Vote live for the tastiest burger joint"
              className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Mode Selection */}
          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-xs font-semibold text-slate-300">Tier List Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 cursor-pointer"
            >
              <option value="live">Live Voting (Post to Discord)</option>
              <option value="personal">Personal (Local Web Only)</option>
            </select>
          </div>

          {mode === 'live' && (
            <div className="flex flex-col gap-3 mt-1 bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
              <label className="flex items-start gap-3 text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowCommunityAddItems}
                  onChange={(e) => setAllowCommunityAddItems(e.target.checked)}
                  className="accent-pink-500 w-4 h-4 mt-0.5"
                />
                <div>
                  <div className="font-bold text-white">Allow Community Items</div>
                  <div className="text-xs text-slate-400 mt-0.5">Let Discord users add images to this tier list via web search or URLs.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableDiscussion}
                  onChange={(e) => setEnableDiscussion(e.target.checked)}
                  className="accent-pink-500 w-4 h-4 mt-0.5"
                />
                <div>
                  <div className="font-bold text-white">Create Comment Thread</div>
                  <div className="text-xs text-slate-400 mt-0.5">Automatically open a Discord thread below the tier list for discussion.</div>
                </div>
              </label>
            </div>
          )}

          <button
            type="submit"
            className="mt-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-lg transition"
          >
            Create Tier List Board
          </button>
        </form>
      </div>
    </div>
  );
}
