const path = require('path');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const os = require('os');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = 3000;
const BUILD_TIME = new Date().toISOString();

// Get local network IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Track connected players
const players = new Map();
const enemies = new Map();

// Basic social persistence
const socialFile = path.join(__dirname, 'social.json');
function loadSocial() {
  try {
    if (fs.existsSync(socialFile)) {
      const raw = JSON.parse(fs.readFileSync(socialFile, 'utf8'));
      return {
        friends: raw.friends && typeof raw.friends === 'object' ? raw.friends : {}, // username -> [friendUsernames]
        invites: raw.invites && typeof raw.invites === 'object' ? raw.invites : {}  // username -> [fromUsernames]
      };
    }
  } catch (e) { }
  return { friends: {}, invites: {} };
}
function saveSocial() {
  try { fs.writeFileSync(socialFile, JSON.stringify(social, null, 2), 'utf8'); } catch (e) { }
}
const social = loadSocial();

// Online presence map username <-> socket
const userToSocket = new Map();
const socketToUser = new Map();

function sanitizeName(name) {
  return String(name || '').slice(0, 24).replace(/[^a-zA-Z0-9_\-]/g, '_');
}
function sanitizeText(text) { return String(text || '').slice(0, 400); }
function getFriendsOf(user) { const arr = social.friends[user] || []; return Array.isArray(arr) ? arr : []; }
function addFriendLink(a, b) {
  social.friends[a] = Array.from(new Set([ ...(social.friends[a]||[]), b ]));
  social.friends[b] = Array.from(new Set([ ...(social.friends[b]||[]), a ]));
  saveSocial();
}
function addInvite(to, from) {
  const set = new Set([ ...((social.invites[to]||[])), from ]);
  social.invites[to] = Array.from(set);
  saveSocial();
}
function removeInvite(to, from) {
  const list = (social.invites[to]||[]).filter(n => n !== from);
  social.invites[to] = list;
  saveSocial();
}
function broadcastOnlineUsers() {
  try {
    const online = Array.from(userToSocket.keys());
    io.emit('onlineUsers', online);
  } catch(_){}
}

// Persistent world state
const worldFile = path.join(__dirname, 'world.json');
function loadWorld() {
  try {
    if (fs.existsSync(worldFile)) {
      const raw = JSON.parse(fs.readFileSync(worldFile, 'utf8'));
      return {
        buildings: Array.isArray(raw.buildings) ? raw.buildings : [],
        tileRaises: raw.tileRaises && typeof raw.tileRaises === 'object' ? raw.tileRaises : {},
        plants: Array.isArray(raw.plants) ? raw.plants : [],
        nextBuildingId: Number.isFinite(raw.nextBuildingId) ? raw.nextBuildingId : 1,
        nextPlantId: Number.isFinite(raw.nextPlantId) ? raw.nextPlantId : 1
      };
    }
  } catch (e) { }
  return { buildings: [], tileRaises: {}, plants: [], nextBuildingId: 1, nextPlantId: 1 };
}
function saveWorld() {
  try { fs.writeFileSync(worldFile, JSON.stringify(world, null, 2), 'utf8'); } catch (e) { }
}
const world = loadWorld();

// Initialize plants if missing (simple random distribution)
function initPlantsIfNeeded() {
  if (Array.isArray(world.plants) && world.plants.length > 0) return;
  world.plants = [];
  const TYPES = [ 'spikePine','stubOak','crystalTwig','fanPalm','mushroomTree','tuftGrass','bladePatch','fanGrass' ];
  const NUM = 220;
  for (let i = 0; i < NUM; i++) {
    const type = TYPES[Math.floor(Math.random()*TYPES.length)];
    const x = Math.round((Math.random()*2-1) * 1600);
    const z = Math.round((Math.random()*2-1) * 1600);
    world.plants.push({ id: world.nextPlantId++, type, x, z, alive: true });
  }
  saveWorld();
}
initPlantsIfNeeded();
// Economy persistence
const economyFile = path.join(__dirname, 'economy.json');
function loadEconomy() {
  try {
    if (fs.existsSync(economyFile)) {
      const raw = JSON.parse(fs.readFileSync(economyFile, 'utf8'));
      const credits = raw.credits && typeof raw.credits === 'object' ? raw.credits : {};
      const items = raw.items && typeof raw.items === 'object' ? raw.items : {};
      const counters = raw.counters && typeof raw.counters === 'object' ? raw.counters : { item: 1 };
      return { credits, items, counters };
    }
  } catch (e) { }
  return { credits: {}, items: {}, counters: { item: 1 } };
}
function saveEconomy() {
  try { fs.writeFileSync(economyFile, JSON.stringify(economy, null, 2), 'utf8'); } catch (e) { }
}
const economy = loadEconomy();
function ensureUserEconomy(username) {
  if (!(username in economy.credits)) economy.credits[username] = 1000; // starting credits
  if (!(username in economy.items)) economy.items[username] = [];
  // Ensure at least one basic weapon item
  const hasBasic = (economy.items[username]||[]).some(it => it && it.template === 'kineticProjector');
  if (!hasBasic) {
    const id = 'W' + (economy.counters.item++);
    economy.items[username].push({ id, type: 'weapon', template: 'kineticProjector', name: 'Kinetic Projector', mods: {} });
    saveEconomy();
  }
}
function emitEconomy(socket, username) {
  try {
    ensureUserEconomy(username);
    socket.emit('economyState', { credits: economy.credits[username]||0, items: economy.items[username]||[] });
  } catch(_){}
}

// Price calculator for shop variants
function computePriceForVariant(template, mods, cityName) {
  // Base prices per template
  const basePrices = { kineticProjector: 250, energyDischarger: 500, plasmaCannon: 800, voidRifle: 750, railgun: 900, shotgunScatter: 400, beamLance: 950, arcThrower: 600, grenadeLauncher: 700, sniperLaser: 1000, pulseSMG: 450 };
  const base = basePrices[template] || 300;
  // Mods: damage +5% per +5 dmg, range +2% per +5 range, cooldown - each -50ms adds +5%, chargeUse each +5 adds -3%, accuracy +5% per +0.05
  let mult = 1.0;
  if (mods && typeof mods === 'object') {
    if (Number.isFinite(mods.damage)) mult *= (1 + (mods.damage / 100));
    if (Number.isFinite(mods.range)) mult *= (1 + (mods.range / 100));
    if (Number.isFinite(mods.cooldown)) mult *= (1 + Math.max(0, -mods.cooldown) / 500);
    if (Number.isFinite(mods.chargeUse)) mult *= (1 - Math.max(0, mods.chargeUse) / 100);
    if (Number.isFinite(mods.accuracy)) mult *= (1 + mods.accuracy * 0.5);
  }
  // City factor subtle variation
  const cityFactor = 1.0 + ((cityName || '').length % 3) * 0.05;
  const price = Math.max(50, Math.round(base * mult * cityFactor));
  return price;
}

// Admin page (no auth for prototype) – define before generic static so it doesn't get swallowed
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve landing page at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Game page - serve the game
app.get('/ftd', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static assets for all routes
app.use('/', express.static(path.join(__dirname, 'public')));
// Also expose top-level project assets (e.g., images) via /assets
app.use('/assets', express.static(path.join(__dirname, '..')));

// build version endpoint
app.get('/version', (req, res) => {
  res.json({ build: BUILD_TIME });
});

const expressJson = express.json({ limit: '64kb' });
app.use(expressJson);
let lastMobileDebug = null;
app.post('/mobile-debug', (req, res) => {
  const body = req.body || {};
  // Reset log when event is init
  if (body && body.event === 'init') lastMobileDebug = null;
  lastMobileDebug = body; // keep only the most recent
  try {
    const msg = `[MOBILE_DEBUG] ${new Date().toISOString()} ` +
      `vw=${body.vw} vh=${body.vh} ` +
      `left=${body.leftRect ? `${Math.round(body.leftRect.left)},${Math.round(body.leftRect.top)} ${Math.round(body.leftRect.width)}x${Math.round(body.leftRect.height)}` : 'null'} ` +
      `right=${body.rightRect ? `${Math.round(body.rightRect.left)},${Math.round(body.rightRect.top)} ${Math.round(body.rightRect.width)}x${Math.round(body.rightRect.height)}` : 'null'} ` +
      `event=${body.event}`;

  } catch (_) {}
  res.json({ ok: true });
});

// Optional debug retrieval
app.get('/mobile-debug', (req, res) => {
  res.json(lastMobileDebug || {});
});

// Socket.IO multiplayer handling
io.on('connection', (socket) => {

  
  // Handle player join
  socket.on('playerJoin', (data) => {
    const player = {
      id: socket.id,
      name: sanitizeName(data.name || 'Anonymous'),
      x: data.x || 0,
      y: data.y || 0,
      z: data.z || 0,
      rotation: data.rotation || 0
    };
    
    players.set(socket.id, player);
    // Presence
    userToSocket.set(player.name, socket.id);
    socketToUser.set(socket.id, player.name);
    broadcastOnlineUsers();

    // Economy snapshot
    ensureUserEconomy(player.name);
    emitEconomy(socket, player.name);
    
    // Send existing players to new player
    const existingPlayers = Array.from(players.values()).filter(p => p.id !== socket.id);
    socket.emit('existingPlayers', existingPlayers);
    
    // Send world state to new player (includes plants)
    socket.emit('worldState', { buildings: world.buildings, tileRaises: world.tileRaises, plants: world.plants });
    // Send current enemies to new player
    try { socket.emit('enemiesState', Array.from(enemies.values())); } catch(_) {}

    // Send social snapshot
    try {
      const uname = player.name;
      socket.emit('socialData', { friends: getFriendsOf(uname), invites: social.invites[uname] || [] });
    } catch(_){ }
    
    // Broadcast new player to others
    socket.broadcast.emit('playerJoined', player);
  });

  // Chat: global
  socket.on('chatMessage', ({ text }) => {
    try {
      const from = socketToUser.get(socket.id) || 'Unknown';
      const msg = sanitizeText(text);
      if (!msg) return;
      io.emit('chatMessage', { from, text: msg, ts: Date.now() });
    } catch(e) { }
  });
  // Chat: DM
  socket.on('chatDM', ({ to, text }) => {
    try {
      const from = socketToUser.get(socket.id) || 'Unknown';
      const target = sanitizeName(to);
      const msg = sanitizeText(text);
      if (!target || !msg) return;
      const toSocket = userToSocket.get(target);
      if (toSocket) {
        io.to(toSocket).emit('chatDM', { from, text: msg, ts: Date.now() });
        socket.emit('chatDM', { from, text: msg, ts: Date.now(), echo: true });
      } else {
        socket.emit('chatSystem', { text: `${target} is not online here.`, ts: Date.now() });
      }
    } catch(e) { }
  });

  // Social: friend request
  socket.on('friendRequest', ({ to }) => {
    try {
      const from = socketToUser.get(socket.id);
      const target = sanitizeName(to);
      if (!from || !target || from === target) return;
      const already = new Set(getFriendsOf(from));
      if (already.has(target)) { socket.emit('chatSystem', { text: `${target} is already your friend.`, ts: Date.now() }); return; }
      addInvite(target, from);
      const toSocket = userToSocket.get(target);
      if (toSocket) io.to(toSocket).emit('friendRequest', { from });
      socket.emit('friendRequestSent', { to: target });
    } catch(e) { }
  });

  // Social: friend response
  socket.on('friendRespond', ({ from, accept }) => {
    try {
      const to = socketToUser.get(socket.id);
      const requester = sanitizeName(from);
      if (!to || !requester) return;
      if (accept) {
        addFriendLink(to, requester);
        removeInvite(to, requester);
        const aSock = userToSocket.get(to); const bSock = userToSocket.get(requester);
        if (aSock) io.to(aSock).emit('friendAdded', { friend: requester });
        if (bSock) io.to(bSock).emit('friendAdded', { friend: to });
      } else {
        removeInvite(to, requester);
        const bSock = userToSocket.get(requester);
        if (bSock) io.to(bSock).emit('friendDeclined', { by: to });
      }
    } catch(e) { }
  });

  // Social snapshot refresh
  socket.on('requestSocialData', () => {
    try {
      const uname = socketToUser.get(socket.id);
      socket.emit('socialData', { friends: getFriendsOf(uname), invites: social.invites[uname] || [] });
      broadcastOnlineUsers();
    } catch(_){}
  });
  
  // Handle player movement
  socket.on('playerMove', (data) => {
    const player = players.get(socket.id);
    if (player) {
      player.x = data.x;
      player.y = data.y;
      player.z = data.z;
      player.rotation = data.rotation;
      
      // Broadcast movement to other players
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        x: data.x,
        y: data.y,
        z: data.z,
        rotation: data.rotation
      });
    }
  });

  // Building placement (persistent)
  socket.on('placeBuilding', (data = {}) => {
    try {
      const id = world.nextBuildingId++;
      const b = {
        id,
        type: data.type || 'hexBlock',
        x: Number(data.x) || 0,
        y: Number(data.y) || 0,
        z: Number(data.z) || 0,
        rotation: Number(data.rotation) || 0,
        integrity: Number.isFinite(data.integrity) ? data.integrity : 100,
        maxIntegrity: Number.isFinite(data.maxIntegrity) ? data.maxIntegrity : 100,
        owner: socket.id
      };
      world.buildings.push(b);
      saveWorld();
      io.emit('buildingPlaced', b);
    } catch (e) { }
  });

  socket.on('damageBuilding', ({ id, amount }) => {
    try {
      const b = world.buildings.find(bb => bb.id === id);
      if (!b) return;
      const dmg = Number(amount) || 0;
      b.integrity = Math.max(0, b.integrity - dmg);
      saveWorld();
      if (b.integrity <= 0) {
        world.buildings = world.buildings.filter(bb => bb.id !== id);
        saveWorld();
        io.emit('buildingRemoved', { id });
      } else {
        io.emit('buildingUpdated', { id, integrity: b.integrity });
      }
    } catch (e) { }
  });

  // Raise tile (persistent override)
  socket.on('raiseTile', ({ q, r, amount }) => {
    try {
      const key = `${Number(q)||0},${Number(r)||0}`;
      const inc = Number(amount) || 1;
      world.tileRaises[key] = (world.tileRaises[key] || 0) + inc;
      saveWorld();
      io.emit('tileRaised', { q: Number(q)||0, r: Number(r)||0, count: world.tileRaises[key] });
    } catch (e) { }
  });

  // Enemy synchronization
  socket.on('enemySpawn', (e) => {
    try {
      const id = String(e && e.id);
      if (!id) return;
      const enemy = {
        id,
        type: e.type,
        x: Number(e.x)||0,
        y: Number(e.y)||0,
        z: Number(e.z)||0,
        ownerId: socket.id,
        meta: e.meta || {}
      };
      enemies.set(id, enemy);
      socket.broadcast.emit('enemySpawn', enemy);
    } catch (err) { }
  });

  socket.on('enemyMove', (e) => {
    try {
      const id = String(e && e.id);
      if (!id || !enemies.has(id)) return;
      const enemy = enemies.get(id);
      // Only owner can update
      if (enemy.ownerId !== socket.id) return;
      enemy.x = Number(e.x)||enemy.x;
      enemy.y = Number(e.y)||enemy.y;
      enemy.z = Number(e.z)||enemy.z;
      socket.broadcast.emit('enemyMove', { id: enemy.id, x: enemy.x, y: enemy.y, z: enemy.z });
    } catch (err) { }
  });

  socket.on('enemyDie', (e) => {
    try {
      const id = String(e && e.id);
      if (!id || !enemies.has(id)) return;
      const enemy = enemies.get(id);
      if (enemy.ownerId !== socket.id) return;
      enemies.delete(id);
      io.emit('enemyDie', { id });
    } catch (err) { }
  });
  
  // Economy: request snapshot
  socket.on('requestEconomy', () => {
    try { const user = socketToUser.get(socket.id); emitEconomy(socket, user); } catch(_){}
  });

  // Economy: buy item from shop
  socket.on('buyItem', ({ kind, template, mods, city }) => {
    try {
      const user = socketToUser.get(socket.id);
      if (!user) return;
      ensureUserEconomy(user);
      const price = computePriceForVariant(String(template||''), mods||{}, String(city||''));
      const bal = economy.credits[user] || 0;
      if (bal < price) { socket.emit('purchaseResult', { ok: false, error: 'Not enough Credits' }); return; }
      economy.credits[user] = bal - price;
      const id = (kind === 'armor' ? 'A' : (kind==='drone'?'D':'W')) + (economy.counters.item++);
      let name = template;
      if (kind === 'weapon') {
        const nameMap = { kineticProjector: 'Kinetic Projector', energyDischarger: 'Energy Discharger', plasmaCannon: 'Plasma Cannon', voidRifle: 'Void Rifle', railgun: 'Railgun', shotgunScatter: 'Scatter Shotgun', beamLance: 'Beam Lance', arcThrower: 'Arc Thrower', grenadeLauncher: 'Grenade Launcher', sniperLaser: 'Sniper Laser', pulseSMG: 'Pulse SMG' };
        name = nameMap[template] || template;
      } else if (kind === 'armor') {
        const nameMap = { armor_light: 'Light Vest', armor_medium: 'Composite Plate', armor_heavy: 'Heavy Armor', armor_thermal: 'Thermal Suit', armor_plasma: 'Plasma Weave', armor_shock: 'Faraday Mesh', armor_void: 'Void Plating' };
        name = nameMap[template] || template;
      } else if (kind === 'drone') {
        const nameMap = { drone_mk1: 'Helper Drone Mk I', drone_mk2: 'Helper Drone Mk II' };
        name = nameMap[template] || template;
      }
      const item = { id, type: (kind==='armor'?'armor': kind==='drone'?'drone':'weapon'), template: String(template||''), name, mods: mods||{} };
      economy.items[user].push(item);
      saveEconomy();
      emitEconomy(socket, user);
      socket.emit('purchaseResult', { ok: true, item, newBalance: economy.credits[user] });
    } catch(e) { socket.emit('purchaseResult', { ok: false, error: 'Purchase failed' }); }
  });

  // Client signals request to logout; server will allow immediate if safe, else inform delay
  socket.on('requestLogout', () => {
    try {
      const uname = socketToUser.get(socket.id);
      if (!uname) return;
      // naive immediate ok; client enforces safe delay UI and calls confirm
      socket.emit('logoutReady');
    } catch(_){}
  });
  socket.on('confirmLogout', () => {
    try {
      socket.disconnect(true);
    } catch(_){ }
  });

  // Trade: request and simple credits-for-item trade
  socket.on('tradeRequest', ({ to }) => {
    try {
      const from = socketToUser.get(socket.id);
      const target = sanitizeName(to);
      const toSock = userToSocket.get(target);
      if (toSock) io.to(toSock).emit('tradeRequest', { from });
      else socket.emit('chatSystem', { text: `${target} is not online here.`, ts: Date.now() });
    } catch(_){}
  });

  // Trade propose: offer credits for specific item id owned by target
  socket.on('tradeProposal', ({ to, itemId, credits }) => {
    try {
      const from = socketToUser.get(socket.id);
      const target = sanitizeName(to);
      const toSock = userToSocket.get(target);
      if (!from || !toSock) return;
      io.to(toSock).emit('tradeProposal', { from, itemId, credits: Number(credits)||0 });
    } catch(_){}
  });

  // Trade accept
  socket.on('tradeAccept', ({ from, itemId, credits }) => {
    try {
      const buyer = sanitizeName(from); // who offered credits
      const seller = socketToUser.get(socket.id); // current socket accepts and owns the item
      if (!buyer || !seller) return;
      ensureUserEconomy(buyer); ensureUserEconomy(seller);
      const itemIdx = (economy.items[seller]||[]).findIndex(it => it && it.id === String(itemId));
      if (itemIdx < 0) { socket.emit('tradeResult', { ok: false, error: 'Item not found' }); return; }
      const price = Number(credits)||0;
      if ((economy.credits[buyer]||0) < price) { socket.emit('tradeResult', { ok: false, error: 'Buyer lacks credits' }); return; }
      // Transfer
      const [item] = economy.items[seller].splice(itemIdx, 1);
      economy.credits[buyer] -= price;
      economy.credits[seller] = (economy.credits[seller]||0) + price;
      economy.items[buyer].push(item);
      saveEconomy();
      const buyerSock = userToSocket.get(buyer);
      if (buyerSock) {
        io.to(buyerSock).emit('economyState', { credits: economy.credits[buyer], items: economy.items[buyer] });
        io.to(buyerSock).emit('tradeResult', { ok: true, role: 'buyer', item, credits: price });
      }
      const sellerSock = userToSocket.get(seller);
      if (sellerSock) {
        io.to(sellerSock).emit('economyState', { credits: economy.credits[seller], items: economy.items[seller] });
        io.to(sellerSock).emit('tradeResult', { ok: true, role: 'seller', item, credits: price });
      }
    } catch(e) { socket.emit('tradeResult', { ok: false, error: 'Trade failed' }); }
  });

  socket.on('tradeDecline', ({ from }) => {
    try { const buyerSock = userToSocket.get(sanitizeName(from)); if (buyerSock) io.to(buyerSock).emit('tradeResult', { ok: false, error: 'Declined' }); } catch(_){}
  });

  // Plants: destruction and respawn elsewhere
  socket.on('destroyPlant', ({ id }) => {
    try {
      const pid = Number(id);
      const p = world.plants.find(pp => pp && Number(pp.id) === pid);
      if (!p || !p.alive) return;
      p.alive = false;
      saveWorld();
      io.emit('plantRemoved', { id: p.id });
      // Immediately respawn a plant of same type elsewhere
      const type = p.type;
      const nx = Math.round((Math.random()*2-1) * 1600);
      const nz = Math.round((Math.random()*2-1) * 1600);
      const newPlant = { id: world.nextPlantId++, type, x: nx, z: nz, alive: true };
      world.plants.push(newPlant);
      saveWorld();
      io.emit('plantSpawn', newPlant);
    } catch(e) { }
  });

  // Allow clients to update their displayed name (updates presence mappings)
  socket.on('updateName', (name) => {
    try {
      const newName = sanitizeName(name);
      const p = players.get(socket.id);
      if (!p) return;
      const oldName = p.name;
      if (oldName && userToSocket.get(oldName) === socket.id) userToSocket.delete(oldName);
      p.name = newName;
      userToSocket.set(newName, socket.id);
      socketToUser.set(socket.id, newName);
      broadcastOnlineUsers();
      emitEconomy(socket, newName);
      socket.emit('socialData', { friends: getFriendsOf(newName), invites: social.invites[newName] || [] });
    } catch(_){ }
  });

  // Handle disconnect
  socket.on('disconnect', () => {

    const uname = socketToUser.get(socket.id);
    if (uname) { userToSocket.delete(uname); socketToUser.delete(socket.id); }
    players.delete(socket.id);
    io.emit('playerLeft', socket.id);
    broadcastOnlineUsers();
  });
});

// Listen on all network interfaces
server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();

}); 