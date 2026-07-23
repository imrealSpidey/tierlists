import React, { useState } from 'react';
import { Settings, ChevronUp, ChevronDown, Download, RotateCcw, Search, Upload, Image as ImageIcon, Send } from 'lucide-react';
import html2canvas from 'html2canvas';
import RowSettingsModal from './RowSettingsModal';

export default function TierListBoard({ tierList, activeGuildId, onUpdateTierList, onVote, onSelectItem, onResetVotes, onPublishComplete, isStreamMode = false }) {
  const [activeSettingsTier, setActiveSettingsTier] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('square'); // 'square', 'original'
  const [showAddModal, setShowAddModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [textItemInput, setTextItemInput] = useState('');

  if (!tierList) return null;

  // Handle Drag & Drop between rows / unranked bank
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetTierId) => {
    e.preventDefault();
    if (!draggedItem) return;

    const updatedItems = tierList.items.map(item => {
      if (item.id === draggedItem.id) {
        return { ...item, currentTier: targetTierId };
      }
      return item;
    });

    onUpdateTierList({ ...tierList, items: updatedItems });
    setDraggedItem(null);
  };

  // Move Tier Row Up / Down
  const moveTierRow = (tierId, direction) => {
    const tiers = [...tierList.tiers];
    const index = tiers.findIndex(t => t.id === tierId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tiers.length) return;

    const temp = tiers[index];
    tiers[index] = tiers[targetIndex];
    tiers[targetIndex] = temp;

    onUpdateTierList({ ...tierList, tiers });
  };

  // Row Settings Modal Callbacks
  const handleSaveTier = (updatedTier) => {
    const tiers = tierList.tiers.map(t => t.id === updatedTier.id ? updatedTier : t);
    onUpdateTierList({ ...tierList, tiers });
  };

  const handleDeleteTier = (tierId) => {
    const tiers = tierList.tiers.filter(t => t.id !== tierId);
    // Move items in deleted tier to unranked
    const items = tierList.items.map(i => i.currentTier === tierId ? { ...i, currentTier: null } : i);
    onUpdateTierList({ ...tierList, tiers, items });
  };

  const handleClearTierImages = (tierId) => {
    const items = tierList.items.map(i => i.currentTier === tierId ? { ...i, currentTier: null } : i);
    onUpdateTierList({ ...tierList, items });
  };

  const handleAddTierAbove = (tierId) => {
    const index = tierList.tiers.findIndex(t => t.id === tierId);
    const newTier = { id: `tier_${Date.now()}`, name: 'NEW', color: '#cfff7f' };
    const tiers = [...tierList.tiers];
    tiers.splice(index, 0, newTier);
    onUpdateTierList({ ...tierList, tiers });
  };

  const handleAddTierBelow = (tierId) => {
    const index = tierList.tiers.findIndex(t => t.id === tierId);
    const newTier = { id: `tier_${Date.now()}`, name: 'NEW', color: '#cfff7f' };
    const tiers = [...tierList.tiers];
    tiers.splice(index + 1, 0, newTier);
    onUpdateTierList({ ...tierList, tiers });
  };

  // Google / Web Image Crawler Search
  const executeImageSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`/api/search/images?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.results);
      }
    } catch (err) {
      console.error('Image search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  // Add Searched Image to Tier List
  const addSearchedImageToBank = (img) => {
    const itemName = window.prompt("Enter a name for this item:", img.title || searchQuery);
    if (!itemName) return;

    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: itemName,
      imageUrl: img.url,
      currentTier: null // Unranked bank
    };

    onUpdateTierList({
      ...tierList,
      items: [...tierList.items, newItem]
    });
  };

  // Add Pure Text Item
  const addTextItem = (e) => {
    e.preventDefault();
    if (!textItemInput.trim()) return;

    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: textItemInput.trim(),
      imageUrl: null,
      currentTier: null // Unranked bank
    };

    onUpdateTierList({
      ...tierList,
      items: [...(tierList.items || []), newItem]
    });
    setTextItemInput('');
    setShowAddModal(false);
  };

  // Handle Local File Upload with HTML5 Canvas Compression
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 150;
          
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);
          
          const newItem = {
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            imageUrl: compressedDataUrl,
            currentTier: null
          };
          
          onUpdateTierList({
            ...tierList,
            items: [...(tierList.items || []), newItem]
          });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
    setShowAddModal(false);
  };

  // Export Tier List PNG
  const exportAsImage = async () => {
    const element = document.getElementById('tiermaker-board-canvas');
    if (!element) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${(tierList.title || 'tierlist').toLowerCase().replace(/\s+/g, '-')}-tierlist.png`;
      link.click();
    } catch (err) {
      console.warn('html2canvas failed, using server renderer fallback:', err);
      const link = document.createElement('a');
      link.href = `/api/guilds/${activeGuildId}/tierlists/${tierList.id}/image.png`;
      link.download = `${(tierList.title || 'tierlist').toLowerCase().replace(/\s+/g, '-')}-tierlist.png`;
      link.target = '_blank';
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const publishToDiscord = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/guilds/${activeGuildId}/tierlists/${tierList.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        alert('Successfully published to Discord!');
        if (onPublishComplete) onPublishComplete();
      } else {
        alert('Failed to publish: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error publishing to Discord: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const unrankedItems = tierList.items.filter(item => !item.currentTier);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 text-slate-100 font-sans">
      {/* TierMaker Header Title */}
      <div className="text-left flex flex-col gap-1">
        <input
          type="text"
          value={tierList.title || ''}
          onChange={(e) => onUpdateTierList({ ...tierList, title: e.target.value })}
          className="text-2xl md:text-3xl font-extrabold text-white tracking-tight bg-transparent border-b border-transparent hover:border-slate-700 focus:border-pink-500 focus:outline-none transition-colors w-full px-1 py-1"
          placeholder="Enter Tier List Title"
        />
        <input
          type="text"
          value={tierList.subtitle || ''}
          onChange={(e) => onUpdateTierList({ ...tierList, subtitle: e.target.value })}
          className="text-slate-400 text-sm leading-relaxed max-w-3xl bg-transparent border-b border-transparent hover:border-slate-700 focus:border-pink-500 focus:outline-none transition-colors w-full px-1 py-1"
          placeholder="Enter Tier List Subtitle or Description"
        />
      </div>

      {/* Main TierMaker Board Canvas Container */}
      <div 
        id="tiermaker-board-canvas"
        className="bg-[#1a1a1a] border border-black shadow-2xl flex flex-col gap-1 p-1 select-none"
      >
        {tierList.tiers.map((tier) => {
          const itemsInTier = tierList.items.filter(item => item.currentTier === tier.id);

          return (
            <div
              key={tier.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tier.id)}
              className="flex items-stretch min-h-[90px] border border-black bg-[#0f0f0f]"
            >
              {/* Left Color Header Box */}
              <div
                style={{ backgroundColor: tier.color || '#ff7f7f' }}
                className="w-24 md:w-28 min-w-[90px] flex items-center justify-center p-2 text-black font-extrabold text-center text-sm md:text-base border-r border-black"
              >
                <span className="break-words line-clamp-2">{tier.name || tier.id}</span>
              </div>

              {/* Middle Droppable Items Content */}
              <div className="flex-1 p-1 flex flex-wrap items-center gap-1.5 min-h-[85px]">
                {itemsInTier.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onClick={() => onSelectItem && onSelectItem(item)}
                    className="relative group w-20 h-20 bg-slate-900 border border-black flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className={`w-full h-full ${aspectRatio === 'square' ? 'object-cover' : 'object-contain'}`}
                      />
                    ) : (
                      <span className="text-xs font-bold text-white p-1 text-center truncate">{item.name}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Right Side Gear Controls & Up/Down Arrows */}
              <div className="w-10 bg-[#111111] flex flex-col items-center justify-around border-l border-black p-1 text-slate-400">
                <button
                  onClick={() => setActiveSettingsTier(tier)}
                  className="hover:text-white transition p-1"
                  title="Row Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>

                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveTierRow(tier.id, 'up')}
                    className="hover:text-white transition p-0.5"
                    title="Move Row Up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveTierRow(tier.id, 'down')}
                    className="hover:text-white transition p-0.5"
                    title="Move Row Down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload & Google Image Search Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-slate-800 p-6 rounded-xl flex flex-col gap-6 w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-pink-400" />
                Add Items to Tier List
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-2">
                ✕
              </button>
            </div>

            {/* 1. Local File Upload Input */}
            <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-lg border border-slate-800">
              <label className="bg-white hover:bg-slate-200 text-black font-bold text-sm px-4 py-2.5 rounded cursor-pointer transition">
                Upload Local Images
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-sm text-slate-400">
                Supports multiple images at once
              </span>
            </div>

            {/* 2. Web Image Search Crawler */}
            <form onSubmit={executeImageSearch} className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-slate-300">
                Search Web Images (Google / Wikimedia):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Elden Ring, Python Logo, GigaChad..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>

            {/* 3. Add Pure Text Item */}
            <form onSubmit={addTextItem} className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-slate-300">
                Add Text-Only Item:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={textItemInput}
                  onChange={(e) => setTextItemInput(e.target.value)}
                  placeholder="e.g. A book title, a character name..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
                />
                <button
                  type="submit"
                  disabled={!textItemInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition"
                >
                  + Add Text
                </button>
              </div>
            </form>

            {/* Search Candidates Grid */}
            {searchResults.length > 0 && (
              <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
                <span className="text-sm font-semibold text-slate-400">Click any image to add to your unranked bank:</span>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-60 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800">
                  {searchResults.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => { addSearchedImageToBank(img); setShowAddModal(false); }}
                      className="w-16 h-16 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden cursor-pointer hover:scale-105 hover:border-pink-500 transition-all group relative"
                      title={img.title}
                    >
                      <img src={img.thumbnail} alt={img.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-blue-600/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold">
                        + Add
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unranked Images Bank */}
      <div 
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, null)}
        className="bg-[#141414] border border-slate-800 p-6 rounded-lg flex flex-col gap-4 min-h-[300px] shadow-inner mt-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Unranked Items ({unrankedItems.length})
          </span>
          <div className="flex gap-4 items-center">
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-300 rounded px-3 py-2 focus:outline-none"
            >
              <option value="square">Square Images</option>
              <option value="original">Original Aspect Ratio</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-2 p-3 bg-[#0a0a0a] border border-black flex-1 rounded overflow-y-auto">
          {unrankedItems.length === 0 ? (
            <span className="text-xs italic text-slate-600 w-full text-center py-4">
              Unranked images will appear here. Drag them into tier rows above!
            </span>
          ) : (
            unrankedItems.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onClick={() => onSelectItem && onSelectItem(item)}
                className="w-20 h-20 bg-slate-900 border border-black flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className={`w-full h-full ${aspectRatio === 'square' ? 'object-cover' : 'object-contain'}`}
                  />
                ) : (
                  <span className="text-xs font-bold text-white p-1 text-center truncate">{item.name}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* TierMaker Control Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm px-6 py-3 rounded-lg transition shadow-lg flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Add / Search Items
        </button>

        {tierList.mode !== 'personal' && (
          <button
            onClick={publishToDiscord}
            disabled={publishing}
            className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold text-sm px-6 py-3 rounded-lg transition shadow-lg flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {publishing ? 'Publishing...' : 'Submit & Post to Discord'}
          </button>
        )}

        <button
          onClick={exportAsImage}
          disabled={downloading}
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm px-6 py-3 rounded-lg transition shadow-lg flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Downloading...' : 'Download Image'}
        </button>

        <button
          onClick={() => {
            const updated = tierList.items.map(i => ({ ...i, currentTier: null }));
            onUpdateTierList({ ...tierList, items: updated });
          }}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm px-6 py-3 rounded-lg border border-slate-700 transition"
        >
          Reset Board
        </button>
      </div>

      {/* Row Settings Modal */}
      {activeSettingsTier && (
        <RowSettingsModal
          tier={activeSettingsTier}
          onClose={() => setActiveSettingsTier(null)}
          onSave={handleSaveTier}
          onDelete={handleDeleteTier}
          onClear={handleClearTierImages}
          onAddAbove={handleAddTierAbove}
          onAddBelow={handleAddTierBelow}
        />
      )}
    </div>
  );
}
