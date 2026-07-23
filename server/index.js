import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { renderTierListImage } from './renderer.js';
import { initDiscordBotCore } from './bot.js';
import { searchImages } from './imageSearch.js';
import { MongoClient } from 'mongodb';
import MongoStore from 'connect-mongo';
import crypto from 'crypto';
import fs from 'fs';
import { execSync, spawn } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// Render Keep-Alive
const selfUrl = process.env.RENDER_EXTERNAL_URL;
if (selfUrl) {
  setInterval(() => {
    fetch(`${selfUrl}/api/auth/me`).catch(() => {});
  }, 14 * 60 * 1000);
}

const DB_FILE = path.join(__dirname, '../db.json');

// Initialize local JSON database
let localDb = {
  tierLists: {},
  guildConfigs: {}
};

if (fs.existsSync(DB_FILE)) {
  try {
    localDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to parse db.json:', err);
  }
}

const saveDb = () => {
  fs.writeFileSync(DB_FILE, JSON.stringify(localDb, null, 2));
};

const stateEngine = {
  getTierList: async (guildId, id) => {
    let list = localDb.tierLists[id];
    
    if (list) {
      if (!list.items) list.items = [];
      if (!list.tiers) list.tiers = [
        { id: 'S', name: 'S', color: '#ff7f7f' },
        { id: 'A', name: 'A', color: '#ffbf7f' },
        { id: 'B', name: 'B', color: '#ffff7f' },
        { id: 'C', name: 'C', color: '#7fff7f' },
        { id: 'D', name: 'D', color: '#7fbfff' },
        { id: 'F', name: 'F', color: '#ff7fbf' }
      ];
    }
    return list || null;
  },
  getAllTierLists: async (guildId) => {
    return Object.values(localDb.tierLists).filter(list => list.guildId === guildId);
  },
  saveTierList: async (guildId, id, data) => {
    localDb.tierLists[id] = { ...data, id, guildId };
    saveDb();
    return localDb.tierLists[id];
  },
  addItem: async (guildId, tierListId, item) => {
    const list = await stateEngine.getTierList(guildId, tierListId);
    if (!list) return null;
    
    if (!list.items) list.items = [];
    const newItem = {
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: item.name || 'Custom Item',
      imageUrl: item.imageUrl || item.url || '',
      defaultTier: item.defaultTier || null,
      currentTier: item.currentTier || item.defaultTier || null,
      votes: item.votes || { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 },
      averageScore: item.averageScore || 0
    };

    list.items.push(newItem);
    await stateEngine.saveTierList(guildId, tierListId, list);
    io.to(guildId).emit('item:added', { tierListId, item: newItem });
    return newItem;
  },
  recordVote: async ({ guildId, tierListId, itemId, tier, voterId, voterName, source }) => {
    const list = await stateEngine.getTierList(guildId, tierListId);
    if (!list) return { success: false, message: 'Tier list not found' };

    const item = list.items.find(i => i.id === itemId);
    if (!item) return { success: false, message: 'Item not found in tier list' };

    if (!item.votes) item.votes = {};
    item.votes[tier] = (item.votes[tier] || 0) + 1;

    const tiers = list.tiers || [];
    const maxWeight = tiers.length - 1;
    const weights = {};
    tiers.forEach((t, i) => {
      weights[t.id] = maxWeight - i;
    });

    let totalVotes = 0;
    let weightedSum = 0;

    Object.entries(item.votes).forEach(([t, count]) => {
      totalVotes += count;
      weightedSum += count * (weights[t] || 0);
    });

    item.averageScore = totalVotes > 0 ? weightedSum / totalVotes : 0;
    item.currentTier = tier;

    list.items.sort((a, b) => b.averageScore - a.averageScore);
    
    await stateEngine.saveTierList(guildId, tierListId, list);
    const newVote = { tierListId, itemId, itemName: item.name, tier, voterId, voterName, source, timestamp: Date.now() };
    io.to(guildId).emit('vote:new', newVote);
    return { success: true, item };
  },
  
  getGuildConfig: async (guildId) => {
    return localDb.guildConfigs[guildId] || null;
  },
  setGuildConfig: async (guildId, channelId) => {
    localDb.guildConfigs[guildId] = channelId;
    saveDb();
  },
  getAllGuildConfigs: async () => {
    const map = new Map();
    Object.entries(localDb.guildConfigs).forEach(([gId, cId]) => map.set(gId, cId));
    return map;
  }
};

async function loadTemplatesForGuild(guildId) {
  const templatesDir = path.join(__dirname, '../templates');
  if (!fs.existsSync(templatesDir)) return;
  const files = fs.readdirSync(templatesDir);
  for (const file of files) {
    if (file.endsWith('.json')) {
      const id = file.replace('.json', '');
      const data = JSON.parse(fs.readFileSync(path.join(templatesDir, file), 'utf8'));
      const newList = { ...data, id, items: data.items.map(i => ({ ...i, votes: { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 } })) };
      await stateEngine.saveTierList(guildId, id, newList);
    }
  }
}

app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'super_secret_tierlist_session',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: `${process.env.PUBLIC_URL || 'http://localhost:3001'}/api/auth/discord/callback`,
  scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => done(null, profile)));

const PORT = process.env.SERVER_PORT || process.env.PORT || 3001;

io.on('connection', (socket) => {
  socket.on('join_guild', async (guildId) => {
    socket.join(guildId);
    const lists = await stateEngine.getAllTierLists(guildId);
    if (lists.length === 0) await loadTemplatesForGuild(guildId);
  });
});

app.get('/api/guilds/:guildId/tierlists', async (req, res) => {
  res.json({ success: true, tierLists: await stateEngine.getAllTierLists(req.params.guildId) });
});

app.get('/api/guilds/:guildId/tierlists/:id', async (req, res) => {
  const list = await stateEngine.getTierList(req.params.guildId, req.params.id);
  list ? res.json({ success: true, tierList: list }) : res.status(404).json({ success: false });
});

app.get('/api/auth/discord', (req, res, next) => {
  const base = global.CLOUDFLARE_URL || process.env.PUBLIC_URL || 'http://localhost:3001';
  passport.authenticate('discord', { callbackURL: `${base}/api/auth/discord/callback` })(req, res, next);
});

app.get('/api/auth/discord/callback', (req, res, next) => {
  const base = global.CLOUDFLARE_URL || process.env.PUBLIC_URL || 'http://localhost:3001';
  passport.authenticate('discord', { callbackURL: `${base}/api/auth/discord/callback` }, (err, user, info) => {
    if (err) {
      console.error('\n❌ ================= OAUTH ERROR ================= ❌');
      console.error('Passport Error:', err.message);
      if (err.oauthError && err.oauthError.data) {
        console.error('Discord API Raw Response:', err.oauthError.data);
      }
      console.error('Callback URL used:', `${base}/api/auth/discord/callback`);
      console.error('❌ =============================================== ❌\n');
      return res.redirect('/?error=oauth_failed');
    }
    if (!user) return res.redirect('/');
    
    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.redirect('/');
    });
  })(req, res, next);
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) return res.json({ success: true, user: null });
  
  // Only return guilds where the Discord Bot is actually a member
  const filteredGuilds = req.user.guilds ? req.user.guilds.filter(guild => 
    discordClient && discordClient.guilds.cache.has(guild.id)
  ) : [];
  
  res.json({ success: true, user: { ...req.user, guilds: filteredGuilds } });
});

app.post('/api/auth/logout', (req, res) => req.logout(() => res.json({ success: true })));

app.put('/api/guilds/:guildId/tierlists/:id', async (req, res) => {
  const { guildId, id } = req.params;
  const existingList = await stateEngine.getTierList(guildId, id);
  
  // If server restarted and list is missing from memory, seamlessly recreate it from frontend data
  const updatedList = existingList ? { ...existingList, ...req.body, id, guildId } : { ...req.body, id, guildId };
  
  if (!updatedList.createdAt) updatedList.createdAt = Date.now();
  if (!updatedList.items) updatedList.items = [];
  if (!updatedList.tiers) updatedList.tiers = [
    { id: 'S', name: 'S', color: '#ff7f7f' },
    { id: 'A', name: 'A', color: '#ffbf7f' },
    { id: 'B', name: 'B', color: '#ffff7f' },
    { id: 'C', name: 'C', color: '#7fff7f' },
    { id: 'D', name: 'D', color: '#7fbfff' },
    { id: 'F', name: 'F', color: '#ff7fbf' }
  ];

  await stateEngine.saveTierList(guildId, id, updatedList);
  res.json({ success: true, tierList: updatedList });
});

app.post('/api/guilds/:guildId/tierlists', async (req, res) => {
  const { guildId } = req.params;
  const id = crypto.randomUUID();
  const newList = { 
    ...req.body, 
    id, 
    tiers: req.body.tiers || [
      { id: 'S', name: 'S', color: '#ff7f7f' },
      { id: 'A', name: 'A', color: '#ffbf7f' },
      { id: 'B', name: 'B', color: '#ffff7f' },
      { id: 'C', name: 'C', color: '#7fff7f' },
      { id: 'D', name: 'D', color: '#7fbfff' },
      { id: 'F', name: 'F', color: '#ff7fbf' }
    ],
    items: (req.body.items || []).map(i => ({ ...i, id: crypto.randomUUID(), votes: { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 } })),
    createdAt: Date.now()
  };
  await stateEngine.saveTierList(guildId, id, newList);
  res.json({ success: true, tierList: newList });
});

app.post('/api/guilds/:guildId/vote', async (req, res) => {
  const result = await stateEngine.recordVote({ guildId: req.params.guildId, ...req.body });
  if (result.success) res.json(result);
  else res.status(400).json(result);
});

app.post('/api/guilds/:guildId/tierlists/:tierListId/publish', async (req, res) => {
  if (!discordClient || !discordClient.postTierListToChannel) return res.status(500).json({ success: false, message: 'Discord bot not active' });
  try {
    const success = await discordClient.postTierListToChannel(req.params.tierListId, req.params.guildId);
    res.json({ success });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.get('/api/search/images', async (req, res) => {
  try { res.json({ success: true, results: await searchImages(req.query.q) }); } 
  catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/guilds/:guildId/tierlists/:id/items', async (req, res) => {
  const item = await stateEngine.addItem(req.params.guildId, req.params.id, req.body);
  res.json({ success: true, item });
});

app.get('/api/guilds/:guildId/tierlists/:id/image.png', async (req, res) => {
  const list = await stateEngine.getTierList(req.params.guildId, req.params.id);
  if (!list) return res.status(404).send('Not found');
  const buffer = await renderTierListImage(list);
  res.setHeader('Content-Type', 'image/png');
  res.send(buffer);
});

const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

let discordClient = null;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Engine running on port ${PORT} (0.0.0.0)`);
  
  // Auto-start Cloudflare Tunnel
  try {
    if (!fs.existsSync('./cloudflared')) {
      console.log('☁️ Downloading cloudflared binary...');
      execSync('curl -L -o cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64');
      execSync('chmod +x cloudflared');
    }

    if (process.env.CLOUDFLARE_TOKEN) {
      console.log('☁️ CLOUDFLARE_TOKEN detected. Starting native secure tunnel...');
      const cf = spawn('./cloudflared', ['tunnel', '--no-autoupdate', 'run', '--token', process.env.CLOUDFLARE_TOKEN], { stdio: 'pipe' });
      cf.stdout.on('data', d => console.log(`[Cloudflare] ${d.toString().trim()}`));
      cf.stderr.on('data', d => console.log(`[Cloudflare] ${d.toString().trim()}`));
    } else {
      console.log('☁️ No domain? No problem! Requesting a FREE Cloudflare Quick Tunnel...');
      const cf = spawn('./cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`], { stdio: 'pipe' });
      
      let urlFound = false;
      cf.stderr.on('data', d => {
        const output = d.toString();
        if (!urlFound) {
          const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
          if (match) {
            urlFound = true;
            global.CLOUDFLARE_URL = match[0]; // Save it globally to fix the OAuth Catch-22
            console.log('\n======================================================');
            console.log('🎉 YOUR FREE PUBLIC WEBSITE URL IS:');
            console.log(`👉 ${match[0]}`);
            console.log('======================================================\n');
            console.log('⚠️ IMPORTANT: Copy the URL above and put it in Discord Developer Portal!');
            console.log(`👉 ${match[0]}/api/auth/discord/callback\n`);
          }
        }
      });
    }
  } catch (e) {
    console.error('❌ Failed to start Cloudflare tunnel:', e.message);
  }

  discordClient = initDiscordBotCore({
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    stateEngine
  });
});
