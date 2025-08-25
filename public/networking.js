// Networking helpers

// Expose socket reference on window when created
(function attachSocketExposure(){
  const originalIo = window.io;
  if (typeof originalIo !== 'function') return;
  window.io = function(...args){
    const s = originalIo.apply(this, args);
    try { window.socket = s; } catch (_) {}
    try {
      // Tag socket with mapId for reference
      const mid = (typeof window.getCurrentMapId==='function') ? window.getCurrentMapId() : 'map1';
      s.__mapId = mid;
    } catch(_){}

    // Wire world sync events
    try {
      s.on('worldState', ({ buildings, tileRaises, plants }) => {
        try {
          window.__worldBuildings = Array.isArray(buildings) ? buildings : [];
          window.__tileRaises = tileRaises || {};
          window.__worldPlants = Array.isArray(plants) ? plants : [];
          if (typeof window.applyWorldState === 'function') window.applyWorldState();
        } catch(_) {}
      });
      s.on('buildingPlaced', (b) => {
        try { window.__worldBuildings = window.__worldBuildings || []; window.__worldBuildings.push(b); if (typeof window.applyWorldState === 'function') window.applyWorldState(); } catch(_){}
      });
      s.on('buildingUpdated', (u) => {
        try {
          window.__worldBuildings = window.__worldBuildings || [];
          const idx = window.__worldBuildings.findIndex(bb => bb.id === u.id);
          if (idx >= 0) { window.__worldBuildings[idx] = { ...window.__worldBuildings[idx], ...u }; }
          if (typeof window.applyWorldState === 'function') window.applyWorldState();
        } catch(_){}
      });
      s.on('buildingRemoved', ({ id }) => {
        try { window.__worldBuildings = (window.__worldBuildings||[]).filter(bb => bb.id !== id); if (typeof window.applyWorldState === 'function') window.applyWorldState(); } catch(_){}
      });
      s.on('tileRaised', ({ q, r, count }) => {
        try {
          window.__tileRaises = window.__tileRaises || {};
          window.__tileRaises[`${q},${r}`] = count;
          if (typeof window.applyWorldState === 'function') window.applyWorldState();
        } catch(_){}
      });

      // Enemy events
      s.on('enemiesState', (arr) => {
        try {
          window.__netEnemies = new Map((arr||[]).map(e=>[e.id, e]));
          if (typeof window.syncNetworkEnemies === 'function') window.syncNetworkEnemies();
        } catch(_){}
      });
      s.on('enemySpawn', (e) => {
        try { window.__netEnemies = window.__netEnemies || new Map(); window.__netEnemies.set(e.id, e); if (typeof window.syncNetworkEnemies === 'function') window.syncNetworkEnemies(); } catch(_){}
      });
      s.on('enemyMove', (e) => {
        try {
          if (!window.__netEnemies) window.__netEnemies = new Map();
          const cur = window.__netEnemies.get(e.id) || { id: e.id };
          window.__netEnemies.set(e.id, { ...cur, ...e });
          if (typeof window.syncNetworkEnemies === 'function') window.syncNetworkEnemies();
        } catch(_){}
      });
      s.on('enemyDie', ({ id }) => {
        try { if (window.__netEnemies) window.__netEnemies.delete(id); if (typeof window.syncNetworkEnemies === 'function') window.syncNetworkEnemies(); } catch(_){}
      });
    } catch(_){}

    return s;
  };
})(); 