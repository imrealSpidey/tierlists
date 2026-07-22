import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  Trophy, 
  Vote, 
  Bot, 
  Radio, 
  Plus, 
  ChevronDown, 
  Sparkles, 
  Activity,
  Layers,
  HelpCircle
} from 'lucide-react';

import TierListBoard from './components/TierListBoard';
import ItemDetailsDrawer from './components/ItemDetailsDrawer';
import TierListCreatorModal from './components/TierListCreatorModal';
import Dashboard from './components/Dashboard';

export default function App() {
  const [tierLists, setTierLists] = useState({});
  const [activeListId, setActiveListId] = useState('');
  const [activeGuildId, setActiveGuildId] = useState('');
  const [socket, setSocket] = useState(null);
  const [recentVotes, setRecentVotes] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [toastVote, setToastVote] = useState(null);
  const [viewMode, setViewMode] = useState('dashboard');
  
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Check Discord Authentication
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setUser(data.user);
          if (data.user.guilds && data.user.guilds.length > 0) {
            setActiveGuildId(data.user.guilds[0].id);
          }
        }
        setLoadingAuth(false);
      })
      .catch(err => {
        console.error('Auth check failed:', err);
        setLoadingAuth(false);
      });
  }, []);

  // Initialize Socket.IO connection & fetch initial tier lists for active Guild
  useEffect(() => {
    if (!activeGuildId) return;

    fetch(`/api/guilds/${activeGuildId}/tierlists`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.tierLists) {
          const map = {};
          data.tierLists.forEach(l => { map[l.id] = l; });
          setTierLists(map);
          if (data.tierLists.length > 0) setActiveListId(data.tierLists[0].id);
          else setActiveListId('');
        }
      })
      .catch(err => console.error('Error fetching initial tierlists:', err));

    const socketClient = io(window.location.origin.replace(':5173', ':3001'));
    setSocket(socketClient);

    socketClient.emit('join_guild', activeGuildId);

    socketClient.on('tierlists:all', (data) => {
      setTierLists(data);
    });

    socketClient.on('tierlist:update', ({ tierListId, tierList, newVote }) => {
      setTierLists(prev => ({ ...prev, [tierListId]: tierList }));
      if (newVote) {
        setRecentVotes(prev => [newVote, ...prev.slice(0, 20)]);
        setToastVote(newVote);
        setTimeout(() => setToastVote(null), 4000);
      }
    });

    socketClient.on('vote:new', (vote) => {
      setRecentVotes(prev => [vote, ...prev.slice(0, 20)]);
    });

    socketClient.on('tierlist:created', (newList) => {
      setTierLists(prev => ({ ...prev, [newList.id]: newList }));
      setActiveListId(newList.id);
    });

    return () => {
      socketClient.disconnect();
    };
  }, [activeGuildId]);

  const activeTierList = tierLists[activeListId];

  // Cast a Vote Handler
  const handleVote = async (votePayload) => {
    if (!user) {
      alert('You must be logged in to vote!');
      return;
    }
    
    // Inject the logged in user details
    votePayload.voterName = user.username || user.global_name;
    votePayload.voterId = user.id;

    try {
      const res = await fetch(`/api/guilds/${activeGuildId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(votePayload)
      });
      const data = await res.json();
      if (data.success && data.tierList) {
        setTierLists(prev => ({ ...prev, [votePayload.tierListId]: data.tierList }));
      }
    } catch (err) {
      console.error('Error submitting vote:', err);
    }
  };

  // Reset Votes Handler
  const handleResetVotes = async (listId) => {
    if (!window.confirm('Are you sure you want to reset all vote counts for this tier list?')) return;
    try {
      const res = await fetch(`/api/guilds/${activeGuildId}/tierlists/${listId}/reset`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.tierList) {
        setTierLists(prev => ({ ...prev, [listId]: data.tierList }));
      }
    } catch (err) {
      console.error('Error resetting votes:', err);
    }
  };

  // Update Tier List Handler (for drag drop, renaming, rows)
  const handleUpdateTierList = async (updatedList) => {
    try {
      const res = await fetch(`/api/guilds/${activeGuildId}/tierlists/${updatedList.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList)
      });
      const data = await res.json();
      if (data.success && data.tierList) {
        setTierLists(prev => ({ ...prev, [updatedList.id]: data.tierList }));
      }
    } catch (err) {
      console.error('Error updating tier list:', err);
    }
  };

  // Create Custom Tier List Handler
  const handleCreateTierList = async (newListData) => {
    try {
      const res = await fetch(`/api/guilds/${activeGuildId}/tierlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newListData)
      });
      const data = await res.json();
      if (data.success && data.tierList) {
        setTierLists(prev => ({ ...prev, [data.tierList.id]: data.tierList }));
        setActiveListId(data.tierList.id);
        setViewMode('board');
        setShowCreatorModal(false);
      }
    } catch (err) {
      alert('Error creating tier list: ' + err.message);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-bold animate-pulse">
        Checking authentication...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="glass-panel max-w-md w-full p-8 rounded-3xl flex flex-col items-center text-center gap-6 shadow-2xl shadow-blue-900/20">
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center overflow-hidden border border-slate-800">
            <img src="/logo.png" alt="Cola Tierlists Logo" className="w-14 h-14 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white mb-2">Welcome to Cola Tierlists</h1>
            <p className="text-sm text-slate-400">
              Please log in with Discord to create tier lists, cast votes, and participate in community rankings.
            </p>
          </div>
          <a
            href="/api/auth/discord"
            className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3.5 px-8 rounded-xl transition w-full shadow-lg shadow-[#5865F2]/30 mt-4"
          >
            Log in with Discord
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Toast Notification for Incoming Live Votes */}
      {toastVote && (
        <div className="fixed bottom-6 right-6 z-50 glass-panel px-4 py-3 border-l-4 border-l-pink-500 shadow-2xl flex items-center gap-3 animate-slide-up bg-slate-950/90">
          <Sparkles className="w-5 h-5 text-pink-400 animate-spin" />
          <div className="text-xs">
            <span className="font-bold text-white">{toastVote.voterName}</span> voted{' '}
            <strong className="text-cyan-300">{toastVote.itemName}</strong> into{' '}
            <span className="font-black text-pink-400">Tier [{toastVote.tier}]</span>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              via {toastVote.source}
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 p-0.5 shadow-lg shadow-pink-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-xl">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            </div>
          </div>
          <div>
            <h1 
              onClick={() => setViewMode('dashboard')}
              className="text-lg font-black tracking-tight text-white flex items-center gap-2 cursor-pointer hover:text-pink-400 transition"
            >
              Cola Tierlists <span className="text-[10px] uppercase font-bold text-pink-400 bg-pink-950/80 px-2 py-0.5 rounded-full border border-pink-500/30 cursor-default">Bot & Webhook Engine</span>
            </h1>
            <p className="text-[11px] text-slate-400">Real-Time Community Tier List System</p>
          </div>
        </div>

        {/* Server Selector Dropdown */}
        {user.guilds && user.guilds.length > 0 && (
          <div className="relative ml-auto">
            <select
              value={activeGuildId}
              onChange={(e) => {
                setActiveGuildId(e.target.value);
                setActiveListId('');
              }}
              className="appearance-none bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
            >
              {user.guilds.map((guild) => (
                <option key={guild.id} value={guild.id}>
                  {guild.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>
        )}

        {/* Tier List Selector Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={activeListId}
              onChange={(e) => {
                setActiveListId(e.target.value);
                if (e.target.value) setViewMode('board');
              }}
              className="appearance-none bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:border-pink-500 transition cursor-pointer w-48 truncate"
            >
              {Object.keys(tierLists).length === 0 && <option value="">No Tier Lists Found</option>}
              {Object.values(tierLists).map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title} ({list.items.length} items)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          <button
            onClick={() => setShowCreatorModal(true)}
            className="p-2 rounded-xl bg-pink-600/20 hover:bg-pink-600/40 text-pink-300 border border-pink-500/30 transition"
            title="Create Custom Tier List"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-3 ml-2 border-l border-slate-800">
            <img 
              src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full border border-slate-700"
            />
            <div className="flex flex-col hidden md:flex">
              <span className="text-xs font-bold text-slate-200">{user.global_name || user.username}</span>
              <button 
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.reload();
                }}
                className="text-[10px] text-slate-500 hover:text-red-400 text-left transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col">
        {!activeGuildId ? (
          <div className="flex items-center justify-center h-64 text-slate-500">
            Please select a Discord Server from the top navigation.
          </div>
        ) : viewMode === 'dashboard' ? (
          <Dashboard 
            tierLists={tierLists} 
            onCreateNew={() => setShowCreatorModal(true)} 
            onSelectList={(id) => {
              setActiveListId(id);
              setViewMode('board');
            }} 
          />
        ) : !activeTierList ? (
          <div className="flex items-center justify-center h-64 text-slate-500 flex-col gap-4">
            <div>Tier list not found.</div>
            <button
              onClick={() => setViewMode('dashboard')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-2 rounded-lg"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <TierListBoard
            tierList={activeTierList}
            activeGuildId={activeGuildId}
            onUpdateTierList={handleUpdateTierList}
            onVote={handleVote}
            onSelectItem={setSelectedItem}
            onResetVotes={handleResetVotes}
            onPublishComplete={() => setViewMode('dashboard')}
          />
        )}
      </main>

      {/* Item Details Drawer Modal */}
      {selectedItem && (
        <ItemDetailsDrawer
          item={selectedItem}
          tierList={activeTierList}
          onClose={() => setSelectedItem(null)}
          onVote={handleVote}
          onDelete={(itemId) => {
             const updatedList = { ...activeTierList, items: activeTierList.items.filter(i => i.id !== itemId) };
             handleUpdateTierList(updatedList);
             setSelectedItem(null);
          }}
          onMoveToUnranked={(itemId) => {
             const updatedList = { ...activeTierList, items: activeTierList.items.map(i => i.id === itemId ? { ...i, currentTier: null } : i) };
             handleUpdateTierList(updatedList);
             setSelectedItem(null);
          }}
        />
      )}

      {/* Tier List Creator Modal */}
      {showCreatorModal && (
        <TierListCreatorModal
          onClose={() => setShowCreatorModal(false)}
          onCreate={handleCreateTierList}
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 p-4 text-center text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span>Cola Tierlists Webhook Engine v1.0 • Real-time Socket.IO Active</span>
        </div>
        <div>
          Voted items auto-shift position in real-time across Web, Discord & Twitch
        </div>
      </footer>
    </div>
  );
}
