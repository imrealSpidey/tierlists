import React, { useState } from 'react';
import { X } from 'lucide-react';

const TIERMAKER_SWATCHES = [
  '#ff7f7f', // Red / Pink
  '#ffbf7f', // Light Orange
  '#feff7f', // Soft Yellow
  '#ffff7f', // Bright Yellow
  '#cfff7f', // Lime
  '#7fff7f', // Green
  '#7fffbf', // Mint / Turquoise
  '#7fffff', // Cyan
  '#7fbfff', // Sky Blue
  '#7f7fff', // Indigo / Purple
  '#ff7fff', // Pink
  '#bf7fbf', // Deep Purple
  '#3b3b3b', // Dark Charcoal
  '#858585', // Medium Grey
  '#c2c2c2', // Light Grey
  '#e6e6e6'  // Off White
];

export default function RowSettingsModal({ tier, onClose, onSave, onDelete, onClear, onAddAbove, onAddBelow }) {
  const [name, setName] = useState(tier?.name || tier?.id || 'S');
  const [color, setColor] = useState(tier?.color || '#ff7f7f');

  if (!tier) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white rounded-lg p-6 w-full max-w-xl shadow-2xl relative text-slate-800 border border-slate-300">
        {/* Close Button X */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 text-lg font-bold"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 16 Color Swatches */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {TIERMAKER_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              onClick={() => {
                setColor(swatch);
                onSave({ ...tier, name, color: swatch });
              }}
              style={{ backgroundColor: swatch }}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                color === swatch ? 'scale-125 border-black shadow-md' : 'border-white hover:scale-110'
              }`}
            />
          ))}
        </div>

        {/* Label Text Input */}
        <div className="mb-6">
          <textarea
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              onSave({ ...tier, name: e.target.value, color });
            }}
            rows={2}
            className="w-full border border-slate-300 rounded p-3 text-sm font-sans focus:outline-none focus:border-slate-500 resize-none text-black font-semibold"
          />
        </div>

        {/* Action Grid Buttons (2x2 Layout matching TierMaker) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { onDelete(tier.id); onClose(); }}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2.5 px-4 rounded text-xs transition"
          >
            Delete Row
          </button>

          <button
            onClick={() => { onClear(tier.id); onClose(); }}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2.5 px-4 rounded text-xs transition"
          >
            Clear Row Images
          </button>

          <button
            onClick={() => { onAddAbove(tier.id); onClose(); }}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2.5 px-4 rounded text-xs transition"
          >
            Add a Row Above
          </button>

          <button
            onClick={() => { onAddBelow(tier.id); onClose(); }}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2.5 px-4 rounded text-xs transition"
          >
            Add a Row Below
          </button>
        </div>
      </div>
    </div>
  );
}
