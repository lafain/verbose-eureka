// City generation and decoration

// If maps.js provided definitions, use those; otherwise keep default 3 cities
const __DEFAULT_CITIES = [
  { name: 'Nexus Prime', x: -650, z: -900, radius: 140, primary: true },
  { name: 'Data Spire', x: 900, z: -500, radius: 110 },
  { name: 'Core Hub', x: -200, z: 1300, radius: 120 }
];
const __DEFAULT_STYLES = {
  'Nexus Prime': { primary: 0x406080, secondary: 0x304050, accent: 0xb0c4de },
  'Data Spire':  { primary: 0x804040, secondary: 0x503030, accent: 0xd8bFD8 },
  'Core Hub':    { primary: 0x407040, secondary: 0x305030, accent: 0xedc9af }
};

window.CITIES = Array.isArray(window.CITIES) && window.CITIES.length ? window.CITIES : __DEFAULT_CITIES;
window.CITY_STYLES = window.CITY_STYLES || __DEFAULT_STYLES;

const cityTileMaterials = {
  plateau: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0x0, emissiveIntensity: 0.0, metalness: 0.1, roughness: 0.8 }),
  road: new THREE.MeshStandardMaterial({ color: 0x3a3a3a, emissive: 0x0, emissiveIntensity: 0.0, metalness: 0.2, roughness: 0.6 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x4a4a4a, emissive: 0x0, emissiveIntensity: 0.0, metalness: 0.2, roughness: 0.6 })
};
window.cityTileMaterials = cityTileMaterials;

// Track base city tiles for gameplay constraints (e.g., disallow raises)
window.CITY_TILE_KEYS = window.CITY_TILE_KEYS || new Set();
function markCityTile(q, r) { try { window.CITY_TILE_KEYS.add(`${q},${r}`); } catch(_) {} }

// Ensure overrides map exists and is returned
function getOverrides() {
  if (!(window.CITY_TILE_OVERRIDES instanceof Map)) {
    window.CITY_TILE_OVERRIDES = new Map();
  }
  return window.CITY_TILE_OVERRIDES;
}

// Safe height access (works even if getHeight not yet initialized)
function safeGetHeight(q, r) {
  try {
    if (typeof window.getCityHeight === 'function') return window.getCityHeight(q, r);
    if (typeof window.getHeight === 'function') return window.getHeight(q, r);
  } catch(_) {}
  return 0;
}

window.cityColliders = [];
window.CITY_ROADS = [];

function setCityPlateauAndRoads(city) {
  const tileSize = window.tileSize;
  const overrides = getOverrides();

  // Apply city-specific color scheme (non-neon) to materials for this city's tiles
  const style = (window.CITY_STYLES && window.CITY_STYLES[city.name]) ? window.CITY_STYLES[city.name] : { primary: 0x555555, secondary: 0x444444, accent: 0x999999 };
  const materials = {
    plateau: new THREE.MeshStandardMaterial({ color: style.primary, emissive: 0x0, emissiveIntensity: 0.0, metalness: 0.2, roughness: 0.6 }),
    road: new THREE.MeshStandardMaterial({ color: style.secondary, emissive: 0x0, emissiveIntensity: 0.0, metalness: 0.25, roughness: 0.6 }),
    wall: new THREE.MeshStandardMaterial({ color: style.accent, emissive: 0x0, emissiveIntensity: 0.0, metalness: 0.15, roughness: 0.7 })
  };

  const cx = Math.round(city.x / tileSize);
  const cz = Math.round(city.z / tileSize);
  const rTiles = Math.round(city.radius / tileSize);
  

  let perimeterAvg = 0; let samples = 0;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
    const q = cx + Math.round(Math.cos(a) * (rTiles + 4));
    const r = cz + Math.round(Math.sin(a) * (rTiles + 4));
    perimeterAvg += safeGetHeight(q, r); samples++;
  }
  perimeterAvg = samples ? perimeterAvg / samples : 4.0;
  const plateauHeight = Math.max(8.0, perimeterAvg + 3.0);
  for (let dx = -rTiles; dx <= rTiles; dx++) {
    for (let dz = -rTiles; dz <= rTiles; dz++) {
      const dist = Math.sqrt(dx * dx + dz * dz);
      const q = cx + dx; const r = cz + dz;
      if (dist <= rTiles) {
        overrides.set(`${q},${r}`, { height: plateauHeight, material: materials.plateau });
        markCityTile(q, r);
      }
    }
  }
  const gateAngles = [Math.PI * 0.0, Math.PI * 0.66, Math.PI * 1.33];
  const gateSet = new Set(gateAngles.map(a => `${Math.round(Math.cos(a) * 100)},${Math.round(Math.sin(a) * 100)}`));
  const wallRadius = rTiles - 2;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 128) {
    const dirKey = `${Math.round(Math.cos(a) * 100)},${Math.round(Math.sin(a) * 100)}`;
    const isGateDir = gateSet.has(dirKey);
    const wx = Math.round(cx + Math.cos(a) * wallRadius);
    const wz = Math.round(cz + Math.sin(a) * wallRadius);
    if (!isGateDir) { overrides.set(`${wx},${wz}`, { height: plateauHeight + 7, material: materials.wall }); markCityTile(wx, wz); }
  }
  const rampLength = 32; const rampHalfWidth = 4;
  gateAngles.forEach((a) => {
    const dirX = Math.cos(a); const dirZ = Math.sin(a);
    const sideX = -Math.sin(a); const sideZ =  Math.cos(a);
    for (let i = 0; i < rampLength; i++) {
      const baseQ = cx + Math.round(dirX * (wallRadius + i));
      const baseR = cz + Math.round(dirZ * (wallRadius + i));
      for (let w = -rampHalfWidth; w <= rampHalfWidth; w++) {
        const rq = baseQ + Math.round(sideX * w);
        const rr = baseR + Math.round(sideZ * w);
        const worldH = safeGetHeight(rq, rr);
        const t = i / (rampLength - 1);
        const eased = t * t * (3 - 2 * t);
        const rampH = THREE.MathUtils.lerp(plateauHeight, worldH, eased);
        overrides.set(`${rq},${rr}`, { height: rampH, material: materials.road });
        markCityTile(rq, rr);
      }
    }
  });
  const roadWidth = 3;
  for (let d = -rTiles; d <= rTiles; d++) {
    for (let w = -roadWidth; w <= roadWidth; w++) {
      const key1 = `${cx + d},${cz + w}`; if (overrides.has(key1)) { overrides.set(key1, { height: plateauHeight, material: materials.road }); const [q1,r1]=[cx + d, cz + w]; markCityTile(q1, r1); }
      const key2 = `${cx + w},${cz + d}`; if (overrides.has(key2)) { overrides.set(key2, { height: plateauHeight, material: materials.road }); const [q2,r2]=[cx + w, cz + d]; markCityTile(q2, r2); }
      if (Math.abs(d) < rTiles * 0.85) {
        const key3 = `${cx + d},${cz + d}`; if (overrides.has(key3)) { overrides.set(key3, { height: plateauHeight, material: materials.road }); const [q3,r3]=[cx + d, cz + d]; markCityTile(q3, r3); }
        const key4 = `${cx + d},${cz - d}`; if (overrides.has(key4)) { overrides.set(key4, { height: plateauHeight, material: materials.road }); const [q4,r4]=[cx + d, cz - d]; markCityTile(q4, r4); }
      }
    }
  }
  window.CITY_ROADS.push({ x1: city.x - city.radius, z1: city.z, x2: city.x + city.radius, z2: city.z });
  window.CITY_ROADS.push({ x1: city.x, z1: city.z - city.radius, x2: city.x, z2: city.z + city.radius });
}

// Phase 1: Only set overrides/materials (no scene required)
function prepareCityOverrides() {
  console.log(`[CITY-OVERRIDES] prepareCityOverrides called. Already ready: ${window.__cityOverridesReady}`);
  if (window.__cityOverridesReady) {
    console.log(`[CITY-OVERRIDES] Skipping - already prepared`);
    return;
  }
  
  console.log(`[CITY-OVERRIDES] Preparing overrides for ${(window.CITIES || []).length} cities`);
  (window.CITIES || []).forEach((city, idx) => {
    console.log(`[CITY-OVERRIDES] Setting overrides for city ${idx}: ${city.name} at (${city.x}, ${city.z})`);
    setCityPlateauAndRoads(city);
  });
  window.__cityOverridesReady = true;
  console.log(`[CITY-OVERRIDES] All city overrides prepared`);
}
window.prepareCityOverrides = prepareCityOverrides;

function placeSymmetricBuildings(city) {
  const tileSize = window.tileSize;
  const plateauHeight = safeGetHeight(Math.round(city.x / tileSize), Math.round(city.z / tileSize)); // base city top
  const baseY = plateauHeight + 0.1;
  const style = (window.CITY_STYLES && window.CITY_STYLES[city.name]) ? window.CITY_STYLES[city.name] : { primary: 0x00ffff, secondary: 0x0088ff, accent: 0x44ff88 };


  function addBuilding(mesh) {
    const h = mesh.geometry.parameters && mesh.geometry.parameters.height ? mesh.geometry.parameters.height : 6;
    mesh.position.y = baseY + h / 2;
    mesh.castShadow = false; mesh.receiveShadow = false;
    if (window.scene) {
      window.scene.add(mesh);
    } else {
      console.error('[CITY-ERROR] Scene not available when adding building mesh');
    }
    const bbox = new THREE.Box3().setFromObject(mesh);
    window.cityColliders.push({ box: bbox, mesh });
  }
  function addDecoration(mesh) { 
    mesh.castShadow = false; 
    mesh.receiveShadow = false; 
    if (window.scene) {
      window.scene.add(mesh);
    } else {
      console.error('[CITY-ERROR] Scene not available when adding decoration mesh');
    }
  }

  const coreBase = new THREE.Mesh(new THREE.CylinderGeometry(12, 14, 5, 12), new THREE.MeshPhongMaterial({ color: style.primary, emissive: style.secondary, emissiveIntensity: 0.6 }));
  coreBase.position.set(city.x, 0, city.z); addBuilding(coreBase);
  const coreSpire = new THREE.Mesh(new THREE.ConeGeometry(7, 26, 10), new THREE.MeshPhongMaterial({ color: style.secondary, emissive: style.accent, emissiveIntensity: 0.6 }));
  coreSpire.position.set(city.x, 0, city.z); addBuilding(coreSpire);
  const offsets = [ { dx: 30, dz: 30 }, { dx: -30, dz: 30 }, { dx: -30, dz: -30 }, { dx: 30, dz: -30 } ];
  offsets.forEach(o => {
    const towerMesh = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 18, 10), new THREE.MeshPhongMaterial({ color: style.accent, emissive: style.accent, emissiveIntensity: 0.45 }));
    towerMesh.position.set(city.x + o.dx, 0, city.z + o.dz); addBuilding(towerMesh);
  });
  offsets.forEach(o => {
    const crown = new THREE.Mesh(new THREE.TorusGeometry(6, 0.7, 8, 16), new THREE.MeshBasicMaterial({ color: style.primary, transparent: true, opacity: 0.6 }));
    crown.position.set(city.x + o.dx, baseY + 10, city.z + o.dz); crown.rotation.x = Math.PI / 2; addDecoration(crown);
  });
  offsets.forEach(o => {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(5.5, 10, 6), new THREE.MeshPhongMaterial({ color: style.secondary, emissive: style.secondary, emissiveIntensity: 0.45 }));
    dome.scale.y = 0.6; dome.position.set(city.x + o.dx * 1.6, 0, city.z + o.dz * 1.6); addBuilding(dome);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 8), new THREE.MeshPhongMaterial({ color: style.primary, emissive: style.secondary, emissiveIntensity: 0.35 }));
    cube.position.set(city.x + o.dx * 1.2, 0, city.z + o.dz * 0.6); addBuilding(cube);
  });
  // Do not modify tile heights here; decor only
}

function decorateRamps(city) {
  const style = (window.CITY_STYLES && window.CITY_STYLES[city.name]) ? window.CITY_STYLES[city.name] : { primary: 0x00ffff, secondary: 0x0088ff, accent: 0x44ff88 };

  const cx = city.x, cz = city.z; const rampLength = 28; const edgeOffset = 5; const halfW = 5;
  const gateAngles = [Math.PI * 0.0, Math.PI * 0.66, Math.PI * 1.33];
  gateAngles.forEach(a => {
    const dirX = Math.cos(a), dirZ = Math.sin(a);
    const sideX = -Math.sin(a), sideZ = Math.cos(a);
    for (let i = edgeOffset; i < rampLength; i += 6) {
      const baseQ = Math.round(cx / window.tileSize + dirX * (i));
      const baseR = Math.round(cz / window.tileSize + dirZ * (i));
      for (let w = -halfW; w <= halfW; w++) {
        const rq = baseQ + Math.round(sideX * w);
        const rr = baseR + Math.round(sideZ * w);
        const overrides = getOverrides();
        if (overrides.has(`${rq},${rr}`)) { overrides.set(`${rq},${rr}`, { height: overrides.get(`${rq},${rr}`).height, material: cityTileMaterials.road }); markCityTile(rq, rr); }
      }
    }
  });
}

function placeSymmetricOrnaments(city) {
  const style = (window.CITY_STYLES && window.CITY_STYLES[city.name]) ? window.CITY_STYLES[city.name] : { primary: 0x00ffff, secondary: 0x0088ff, accent: 0x44ff88 };

  for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
    const radius = 18;
    const px = city.x + Math.cos(a) * radius;
    const pz = city.z + Math.sin(a) * radius;
    const mat = new THREE.MeshPhongMaterial({ color: style.primary, emissive: style.secondary, emissiveIntensity: 0.5 });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(2, 0), mat);
    gem.position.set(px, 0, pz);
    if (window.scene) {
      window.scene.add(gem);
    } else {
      console.error('[CITY-ERROR] Scene not available when adding gem');
    }
  }
}

function buildHandcraftedCity(city) {
  setCityPlateauAndRoads(city);
  placeSymmetricBuildings(city);
  decorateRamps(city);
  placeSymmetricOrnaments(city);
  const centerGeometry = new THREE.CylinderGeometry(6, 8, 26, 12);
  const style = CITY_STYLES[city.name] || { primary: 0x00ffff, secondary: 0x0088ff };
  const centerMaterial = new THREE.MeshPhongMaterial({ color: style.primary, emissive: style.secondary, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 });
  const centerTower = new THREE.Mesh(centerGeometry, centerMaterial);
  const { x: gridX, y: gridY } = window.cartesianToGrid(city.x, city.z, window.tileSize);
  const terrainHeight = safeGetHeight(gridX, gridY);
  centerTower.position.set(city.x, terrainHeight + 13, city.z);
  if (window.scene) {
    window.scene.add(centerTower);
  } else {
    console.error('[CITY-ERROR] Scene not available when adding center tower');
  }
}

function generateCities() { if (window.__citiesBuilt) return; CITIES.forEach(city => buildHandcraftedCity(city)); window.__citiesBuilt = true; }
window.generateCities = generateCities;
window.refreshChunksAroundCity = function refreshChunksAroundCity(city) {
  const tileSize = window.tileSize;
  const minX = Math.floor((city.x - city.radius) / tileSize);
  const maxX = Math.ceil((city.x + city.radius) / tileSize);
  const minZ = Math.floor((city.z - city.radius) / tileSize);
  const maxZ = Math.ceil((city.z + city.radius) / tileSize);
  const chunkSize = window.isMobileDevice() ? 10 : 12;
  const minCQ = Math.floor(minX / chunkSize);
  const maxCQ = Math.floor(maxX / chunkSize);
  const minCR = Math.floor(minZ / chunkSize);
  const maxCR = Math.floor(maxZ / chunkSize);
  for (let cq = minCQ; cq <= maxCQ; cq++) {
    for (let cr = minCR; cr <= maxCR; cr++) {
      if (typeof window.unloadChunk === 'function') window.unloadChunk(cq, cr);
      if (typeof window.loadChunk === 'function') window.loadChunk(cq, cr);
    }
  }
}; 