(function(){
  // Fixed portal layout linking cities across maps; every map is reachable via at least one connection
  // Format: { from: { map, city }, to: { map, city } }
  const PORTAL_LINKS = [
    { from: { map: 'map1', city: 'Nexus Prime' },    to: { map: 'map2', city: 'Neon Harbor' } },
    { from: { map: 'map1', city: 'Data Spire' },     to: { map: 'map3', city: 'Echo Verge' } },
    { from: { map: 'map1', city: 'Core Hub' },       to: { map: 'map4', city: 'Sapphire Node' } },

    { from: { map: 'map2', city: 'Ionis Gate' },     to: { map: 'map5', city: 'Verdant Loom' } },
    { from: { map: 'map2', city: 'Neon Harbor' },    to: { map: 'map3', city: 'Aurora City' } },

    { from: { map: 'map3', city: 'Aurora City' },    to: { map: 'map6', city: 'Amber Bastion' } },
    { from: { map: 'map3', city: 'Flux Ridge' },     to: { map: 'map5', city: 'Glacier Array' } },

    { from: { map: 'map4', city: 'Obsidian Fold' },  to: { map: 'map6', city: 'Cerulean Span' } },
    { from: { map: 'map4', city: 'Sapphire Node' },  to: { map: 'map2', city: 'Quartz Reach' } },

    { from: { map: 'map5', city: 'Cinder Sprawl' },  to: { map: 'map1', city: 'Nexus Prime' } },

    { from: { map: 'map6', city: 'Violet Crown' },   to: { map: 'map2', city: 'Ionis Gate' } }
  ];

  function getLinksFrom(mapId){ return PORTAL_LINKS.filter(l => l.from.map === mapId); }
  function getLinkFromCity(mapId, cityName){ return PORTAL_LINKS.find(l => l.from.map === mapId && l.from.city === cityName); }

  const PORTALS = [];
  let builtMapId = null;
  const builtCities = new Set();
  function buildCityPortal(city){
    try {
      if (!window.scene || !THREE || !city) return null;
      if (builtCities.has(city.name)) return null; // already built for this city
      const y = (typeof window.sampleGroundHeightAt === 'function')
        ? (window.sampleGroundHeightAt(city.x, city.z) + 0.2)
        : 0.2;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(6, 0.6, 12, 24),
        new THREE.MeshBasicMaterial({ color: 0x88ffff, transparent: true, opacity: 0.8 })
      );
      ring.position.set(city.x + 24, y + 6, city.z);
      ring.rotation.x = Math.PI/2;
      scene.add(ring);
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(6, 6, 0.6, 24),
        new THREE.MeshPhongMaterial({ color: 0x003355, emissive: 0x0099aa, emissiveIntensity: 0.5 })
      );
      pad.position.set(city.x + 24, y, city.z);
      scene.add(pad);
      const label = makeBillboardText('PORTAL', 0x88ffff);
      if (label) { label.position.set(city.x + 24, y + 9, city.z); scene.add(label); }
      PORTALS.push({ cityName: city.name, x: city.x + 24, y, z: city.z, mesh: ring, pad, label });
      builtCities.add(city.name);
      return PORTALS[PORTALS.length - 1];
    } catch(_) { return null; }
  }

  function clearPortals(){
    try {
      while (PORTALS.length) {
        const p = PORTALS.pop();
        try { p.mesh && p.mesh.parent && p.mesh.parent.remove(p.mesh); } catch(_){ }
        try { p.pad && p.pad.parent && p.pad.parent.remove(p.pad); } catch(_){ }
        try { p.label && p.label.parent && p.label.parent.remove(p.label); } catch(_){ }
      }
      builtCities.clear();
    } catch(_){}
  }

  function makeBillboardText(txt, color){
    try {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 64;
      const ctx = c.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,256,64);
      ctx.font = 'bold 28px monospace'; ctx.fillStyle = '#'+(color>>>0).toString(16).padStart(6,'0');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(txt, 128, 32);
      const tex = new THREE.CanvasTexture(c);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      spr.scale.set(6, 1.5, 1);
      return spr;
    } catch(_) { return null; }
  }

  function ensurePortalsBuilt(){
    if (!window.CITIES || !Array.isArray(window.CITIES)) return;
    const mapId = (typeof window.getCurrentMapId==='function') ? window.getCurrentMapId() : 'map1';
    if (builtMapId !== mapId) {
      clearPortals();
      builtMapId = mapId;
    }
    (window.CITIES||[]).forEach(c => {
      const link = getLinkFromCity(mapId, c.name);
      if (link) buildCityPortal(c);
    });
  }

  function tryPortalTeleport(){
    if (!window.player || PORTALS.length===0) return;
    const mapId = (typeof window.getCurrentMapId==='function') ? window.getCurrentMapId() : 'map1';
    const near = PORTALS.find(p => {
      const dx = player.position.x - p.x; const dz = player.position.z - p.z; return (dx*dx + dz*dz) < (7*7);
    });
    if (!near) return;
    // find link
    const link = getLinkFromCity(mapId, near.cityName);
    if (!link) return;
    switchToMapAtCity(link.to.map, link.to.city);
  }

  function switchToMapAtCity(targetMapId, targetCityName){
    try { localStorage.setItem('ftd_last_map', targetMapId); } catch(_){ }
    const def = (window.MAPS && window.MAPS[targetMapId]) ? window.MAPS[targetMapId] : null;
    if (!def) return;
    // Optional: server URL override
    const serverUrl = (typeof window.getSocketUrlForMap==='function') ? window.getSocketUrlForMap(targetMapId) : '';
    // Reconnect socket to target server (if provided)
    try {
      if (window.socket && window.socket.disconnect) { window.socket.disconnect(); }
      if (typeof io === 'function') {
        window.socket = serverUrl ? io(serverUrl, { transports: ['websocket'] }) : io();
        if (typeof window.setupMultiplayerEvents === 'function') window.setupMultiplayerEvents();
        try { window.socket.emit && window.socket.emit('requestSocialData'); window.socket.emit && window.socket.emit('requestEconomy'); } catch(_){}
      }
    } catch(_){}
    // Rebuild cities for target map and place player at target city edge
    try {
      window.CITIES = def.cities.map(c => ({ ...c }));
      window.CITY_STYLES = { ...def.styles };
      if (typeof window.prepareCityOverrides === 'function') {
        window.__cityOverridesReady = false; // force rebuild
        window.prepareCityOverrides();
      }
      if (typeof window.generateCities === 'function') {
        window.__citiesBuilt = false; // force redraw
        window.generateCities();
      }
      const city = (window.CITIES||[]).find(c => c.name === targetCityName) || (window.CITIES||[])[0];
      if (city && window.player) {
        const angle = Math.PI; const distance = (city.radius||100) + 30;
        const nx = city.x + Math.cos(angle) * distance;
        const nz = city.z + Math.sin(angle) * distance;
        const h = (typeof window.sampleGroundHeightAt==='function') ? window.sampleGroundHeightAt(nx, nz) : 1;
        window.player.position.set(nx, Math.max((h||0)+ (window.PLAYER_Y_OFFSET||0.6), 1.0), nz);
        if (typeof window.updateChunks === 'function') {
          const { q, r } = window.cartesianToAxial(window.player.position.x, window.player.position.z, window.tileSize);
          window.updateChunks(q, r);
        }
      }
      // Reset and build portals for new map
      clearPortals();
      builtMapId = targetMapId;
      ensurePortalsBuilt();
    } catch(_){}
  }

  function tickPortals(){
    ensurePortalsBuilt();
    tryPortalTeleport();
  }

  window.PORTAL_LINKS = PORTAL_LINKS;
  window.ensurePortalsBuilt = ensurePortalsBuilt;
  window.switchToMapAtCity = switchToMapAtCity;
  window.tickPortals = tickPortals;
})(); 