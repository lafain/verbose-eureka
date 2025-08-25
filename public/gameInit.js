// Game initialization and main loop

let scene, camera, renderer, player;
let simplex;
let BGUtils;
let lastTime = 0;
let frameCount = 0;
let targetPlayerY = 1.0;
let socket = null;
let __introDone = false;
let playerShadow = null;

// Intro debug logger with performance tracking
const introPerf = { start: 0, marks: [] };
function introLog(...args){ 
  // Debug logging disabled
}

// Enable intro debugging (set to true to see detailed logs)
window.DEBUG_INTRO = false;

// Run mode flag (desktop R)
window.runMode = (typeof window.runMode === 'boolean') ? window.runMode : false;

// Export some globals to window for other modules
window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.player = player;
window.playerShadow = playerShadow;
window.selectedEnemy = null;
window.selectedRing = null;

// Import simplex for terrain
window.simplex = simplex;

function setupLighting() {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.8); // Slightly brighter for intro visibility
    scene.add(ambientLight);
    const mainLight = new THREE.DirectionalLight(0x00ffff, 0.9);
    mainLight.position.set(10, 30, 10);
    scene.add(mainLight);
  } else {
    const ambientLight = new THREE.AmbientLight(0x001122, 0.4); // Slightly brighter ambient
    scene.add(ambientLight);
    const neonSun = new THREE.DirectionalLight(0x00ffff, 1.3);
    neonSun.position.set(30, 50, 20);
    neonSun.castShadow = false;
    scene.add(neonSun);
    const rimLight = new THREE.DirectionalLight(0xff00aa, 0.7);
    rimLight.position.set(-20, 25, -30);
    scene.add(rimLight);
    const fillLight = new THREE.DirectionalLight(0x4477ff, 0.4);
    fillLight.position.set(0, 30, 0);
    scene.add(fillLight);
  }
}

function createPlayer() {
  const playerGeo = new THREE.ConeGeometry(0.5, 1, 4);
  // Randomize player color per session and reuse for the player intro egg
  const randColors = [0x00ffff, 0xff66ff, 0xffcc33, 0x66ff66, 0xff8855, 0x8899ff, 0xff44aa, 0x44ffee];
  const pick = randColors[Math.floor(Math.random()*randColors.length)];
  window.__playerColor = pick;
  const playerMat = new THREE.MeshPhongMaterial({ color: window.__playerColor, emissive: 0x0088ff, emissiveIntensity: 0.3 });
  player = new THREE.Mesh(playerGeo, playerMat);
  player.rotation.x = -Math.PI / 2;
  setSpawnNearLargestCity();
  window.player = player;
  window.renderer = renderer;
  // place camera relative to player
  camera.position.copy(player.position.clone().add(window.cameraOffset));
  const lookTarget = new THREE.Vector3(
    camera.position.x - Math.sin(window.cameraRotation) * window.cameraDistance,
    player.position.y,
    camera.position.z - Math.cos(window.cameraRotation) * window.cameraDistance
  );
  camera.lookAt(lookTarget);
  scene.add(player);

  const playerName = localStorage.getItem('ftd_player');
  if (playerName) {
    const nameTag = createNameTag(playerName);
    player.add(nameTag);
  }
}

function createNameTag(name) {
  // Create a temporary canvas to measure text
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = 'bold 48px monospace';
  const textMetrics = tempCtx.measureText(name);
  const textWidth = textMetrics.width;
  
  // Size canvas to fit text with minimal padding
  const padding = 20;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = Math.min(512, textWidth + padding * 2);
  canvas.height = 80; // Reduced height
  
  // Background with border
  context.fillStyle = 'rgba(0, 0, 0, 0.85)'; 
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#00ffff';
  context.lineWidth = 3;
  context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  
  // Text with outline for better visibility
  context.font = 'bold 48px monospace'; 
  context.textAlign = 'center'; 
  context.textBaseline = 'middle';
  
  // Text outline (black)
  context.strokeStyle = '#000000';
  context.lineWidth = 5;
  context.strokeText(name, canvas.width / 2, canvas.height / 2);
  
  // Main text
  context.fillStyle = '#00ffff';
  context.fillText(name, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMaterial);
  // Scale based on actual canvas size
  sprite.scale.set(canvas.width / 100, canvas.height / 100, 1);
  sprite.position.y = 2.0; // Higher position above player
  return sprite;
}

function initThreeJS() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011); // Slightly lighter than pure black for visibility
  scene.fog = new THREE.Fog(0x000022, 100, 500); // Add fog for depth
  // Camera
  camera = new THREE.PerspectiveCamera(60, window.GAME_ASPECT_RATIO, 0.1, 1000);
  window.camera = camera;
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: window.innerWidth > 768, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000022);
  renderer.setSize(window.innerWidth, window.innerHeight);
  window.renderer = renderer;

  // Utils
  BGUtils = window.BufferGeometryUtils || THREE.BufferGeometryUtils;
  if (!BGUtils || typeof BGUtils.mergeGeometries !== 'function') BGUtils = null;

  // Noise
  if (typeof SimplexNoise !== 'undefined') {
    simplex = new SimplexNoise((window.seedParam || 12345).toString());
    window.simplex = simplex;
  } else {
    simplex = { noise2D: () => 0 };
    window.simplex = simplex;
  }

  // Setup lighting FIRST before creating player/terrain
  setupLighting();
  
  // Then create player and terrain
  createPlayer();

  // DOM
  const gameArea = document.getElementById('gameArea');
  if (gameArea) gameArea.appendChild(renderer.domElement);
  // Ensure initial sizing is applied before any intro runs
  try { if (window.resizeGame) { window.resizeGame(); } if (window.checkOrientation) { window.checkOrientation(); } } catch(_) {}

  // Don't load any chunks here - let the intro handle it
  // Chunks will load after intro completes

  // Multiplayer after player created
  initializeMultiplayer();
}

// Multiplayer lightweight glue
const otherPlayers = new Map();
window.otherPlayers = otherPlayers;
function initializeMultiplayer() { window.initializeMultiplayer = initializeMultiplayer;
  if (typeof io !== 'function') return;
  try {
    const mapId = (typeof window.getCurrentMapId==='function') ? window.getCurrentMapId() : 'map1';
    const url = (typeof window.getSocketUrlForMap==='function') ? window.getSocketUrlForMap(mapId) : '';
    socket = url ? io(url, { transports: ['websocket'] }) : io();
    setupMultiplayerEvents();
  } catch (_) {}
}
function setupMultiplayerEvents() { window.setupMultiplayerEvents = setupMultiplayerEvents;
  if (!socket) return;
  const playerName = localStorage.getItem('ftd_player');
  if (!playerName) return;
  socket.emit('playerJoin', { name: playerName, x: player.position.x, y: player.position.y, z: player.position.z, rotation: player.rotation.z });
  socket.on('existingPlayers', (players) => { players.forEach(createOtherPlayer); });
  socket.on('playerJoined', createOtherPlayer);
  socket.on('playerMoved', (data) => { const op = otherPlayers.get(data.id); if (op) { op.mesh.position.set(data.x, data.y, data.z); op.mesh.rotation.z = data.rotation; } });
  socket.on('playerLeft', (id) => { const op = otherPlayers.get(id); if (op) { scene.remove(op.mesh); otherPlayers.delete(id); } });
}
function createOtherPlayer(playerData) {
  const otherGeo = new THREE.ConeGeometry(0.5, 1, 4);
  const otherMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
  const otherMesh = new THREE.Mesh(otherGeo, otherMat);
  otherMesh.rotation.x = -Math.PI / 2;
  otherMesh.position.set(playerData.x, playerData.y, playerData.z);
  otherMesh.rotation.z = playerData.rotation;
  const nameTag = createNameTag(playerData.name);
  otherMesh.add(nameTag);
  scene.add(otherMesh);
  otherPlayers.set(playerData.id, { mesh: otherMesh, data: playerData });
}

// Chunks
const chunkSize = window.isMobileDevice() ? 10 : 12;
const chunkRenderDistance = window.isMobileDevice() ? 1 : 2;
const MAX_CHUNK_DISTANCE_FROM_PLAYER = window.isMobileDevice() ? 3 : 5; // Max distance even if in camera view
const loadedChunks = new Map();
window.loadedChunks = loadedChunks; // Expose for intro to check loading status
const chunkLoadQueue = [];
const MAX_CHUNKS_PER_FRAME = window.isMobileDevice() ? 2 : 4; // Increased since async loading won't block render loop
let cinematicMode = false; // Flag to control terrain loading during cinematic
let chunkLoadingPaused = false; // Pause chunk loading during critical moments
const pendingChunkLoads = new Map(); // Track pending async chunk loads
window.cinematicMode = false; // Expose for intro control
window.chunkLoadingPaused = false; // Expose for intro control



// Check if a chunk contains city tiles or infrastructure
function chunkContainsCityTiles(chunkQ, chunkR) {
  const startQ = chunkQ * chunkSize;
  const startR = chunkR * chunkSize;
  
  // Check if any tile in this chunk has city overrides
  for (let dq = 0; dq < chunkSize; dq++) {
    for (let dr = 0; dr < chunkSize; dr++) {
      const q = startQ + dq;
      const r = startR + dr;
      const key = `${q},${r}`;
      
      // Check if this tile is a city tile or has city overrides
      if (window.CITY_TILE_KEYS && window.CITY_TILE_KEYS.has(key)) {
        return true;
      }
      if (window.CITY_TILE_OVERRIDES && window.CITY_TILE_OVERRIDES.has(key)) {
        return true;
      }
    }
  }
  return false;
}
function getChunkKey(cq, cr) { return `${cq},${cr}`; }
function loadChunk(cq, cr, forceLoad = false) { 
  const key = getChunkKey(cq, cr); 
  
  // DEBUG: Track all chunk load attempts
  console.log(`[CHUNK-DEBUG] loadChunk called: ${key}, forceLoad=${forceLoad}, already loaded=${loadedChunks.has(key)}, pending=${pendingChunkLoads.has(key)}`);
  
  if (loadedChunks.has(key) || pendingChunkLoads.has(key)) {
    console.log(`[CHUNK-DEBUG] Skipping ${key} - already loaded or pending`);
    return;
  } 
  
  // If chunk loading is paused and not forced, queue it for later
  if (chunkLoadingPaused && !forceLoad) {
    console.log(`[CHUNK-DEBUG] Queueing ${key} - chunkLoadingPaused=true`);
    if (!chunkLoadQueue.some(c => c.chunkQ === cq && c.chunkR === cr)) {
      chunkLoadQueue.push({ chunkQ: cq, chunkR: cr });
    }
    return;
  }
  
  // Mark chunk as pending to prevent duplicate requests
  pendingChunkLoads.set(key, true);
  
  // If forced (for city chunks during intro), load IMMEDIATELY
  if (forceLoad) {
    console.log(`[CHUNK-DEBUG] FORCE LOADING ${key} - creating chunk NOW`);
    try {
      const chunkStartQ = cq * chunkSize;
      const chunkStartR = cr * chunkSize;
      console.log(`[CHUNK-DEBUG] Creating FTD_Chunk at Q=${chunkStartQ}, R=${chunkStartR}, size=${chunkSize}`);
      
      const chunk = new window.FTD_Chunk(cq*chunkSize, cr*chunkSize, chunkSize, scene, window.createTileMesh); 
      loadedChunks.set(key, chunk);
      pendingChunkLoads.delete(key);
      
      // Check if this chunk contains city tiles
      let cityTileCount = 0;
      if (window.CITIES) {
        for (const city of window.CITIES) {
          const cityHex = window.cartesianToAxial(city.x, city.z, window.tileSize || 2);
          const cityRadius = Math.ceil(city.radius / (window.tileSize || 2));
          
          // Check if chunk overlaps with city
          if (Math.abs(chunkStartQ - cityHex.q) <= cityRadius + chunkSize &&
              Math.abs(chunkStartR - cityHex.r) <= cityRadius + chunkSize) {
            cityTileCount++;
          }
        }
      }
      
      console.log(`[CHUNK-DEBUG] Force loaded ${key} successfully! Contains city tiles: ${cityTileCount > 0}`);
      return; // Done immediately
    } catch(error) {
      console.error(`[CHUNK-DEBUG] ERROR force loading ${key}:`, error);
      pendingChunkLoads.delete(key);
      return;
    }
  }
  
  // Load chunk asynchronously to avoid blocking render loop (normal gameplay)
  const loadAsync = () => {
    try {
      // Double-check we still need this chunk
      if (loadedChunks.has(key)) {
        pendingChunkLoads.delete(key);
        return;
      }
      
      const chunk = new window.FTD_Chunk(cq*chunkSize, cr*chunkSize, chunkSize, scene, window.createTileMesh); 
      loadedChunks.set(key, chunk);
      pendingChunkLoads.delete(key);
    } catch(error) {

      pendingChunkLoads.delete(key);
    }
  };
  
  // Use requestIdleCallback if available, otherwise setTimeout
  const timeout = 100;
  if (window.requestIdleCallback) {
    window.requestIdleCallback(loadAsync, { timeout });
  } else {
    setTimeout(loadAsync, 0);
  }
}
function unloadChunk(cq, cr) { 
  const key = getChunkKey(cq, cr); 
  const chunk = loadedChunks.get(key); 
  if (!chunk) return; 
  
  // If chunk is still loading, just remove the loading marker
  if (chunk.loading) {
    loadedChunks.delete(key);
    return;
  }
  
  // Dispose of actual chunk resources
  if (chunk.group) {
    scene.remove(chunk.group); 
    chunk.group.traverse((child) => { 
      if (child.geometry) child.geometry.dispose(); 
      if (child.material) { 
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose()); 
        else child.material.dispose(); 
      } 
    }); 
  }
  loadedChunks.delete(key); 
}
function isChunkInView(chunkQ, chunkR) {
  const minQ = chunkQ * chunkSize; const minR = chunkR * chunkSize; const maxQ = minQ + chunkSize; const maxR = minR + chunkSize;
  const corners = [ window.axialToCartesian(minQ, minR, window.tileSize), window.axialToCartesian(maxQ, minR, window.tileSize), window.axialToCartesian(minQ, maxR, window.tileSize), window.axialToCartesian(maxQ, maxR, window.tileSize) ];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxHeight = 0;
  for (let dq = 0; dq <= chunkSize; dq += Math.floor(chunkSize/2)) {
    for (let dr = 0; dr <= chunkSize; dr += Math.floor(chunkSize/2)) {
      const q = minQ + dq; const r = minR + dr; const h = window.getHeight(q, r); if (h > maxHeight) maxHeight = h;
    }
  }
  corners.forEach(({x,z}) => { if (x < minX) minX = x; if (x > maxX) maxX = x; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z; });
  const chunkCenter = new THREE.Vector3((minX+maxX)/2, maxHeight/2, (minZ+maxZ)/2);
  const chunkSize3D = new THREE.Vector3(maxX-minX, Math.max(maxHeight, 10), maxZ-minZ);
  const frustum = new THREE.Frustum();
  const cameraMatrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(cameraMatrix);
  const box = new THREE.Box3().setFromCenterAndSize(chunkCenter, chunkSize3D);
  return frustum.intersectsBox(box);
}
function updateChunks(playerQ, playerR) {
  // During cinematic mode or when paused, skip terrain chunk loading
  if (cinematicMode || chunkLoadingPaused) {
    console.log(`[UPDATE-CHUNKS-DEBUG] Skipping updateChunks - cinematicMode=${cinematicMode}, chunkLoadingPaused=${chunkLoadingPaused}`);
    return;
  }
  
  console.log(`[UPDATE-CHUNKS-DEBUG] updateChunks called with player at (${playerQ}, ${playerR})`);
  
  const cameraWorldPos = camera.position;
  const cameraHexPos = window.cartesianToAxial(cameraWorldPos.x, cameraWorldPos.z, window.tileSize);
  const cameraChunkQ = Math.floor(cameraHexPos.q / chunkSize);
  const cameraChunkR = Math.floor(cameraHexPos.r / chunkSize);
  const playerChunkQ = Math.floor(playerQ / chunkSize);
  const playerChunkR = Math.floor(playerR / chunkSize);
  const chunksToLoad = [];
  const searchRadius = chunkRenderDistance + 1;
  for (let dq=-searchRadius; dq<=searchRadius; dq++) {
    for (let dr=-searchRadius; dr<=searchRadius; dr++) {
      const chunkQ = cameraChunkQ + dq; const chunkR = cameraChunkR + dr; const key = getChunkKey(chunkQ, chunkR);
      if (!loadedChunks.has(key)) {
        const distToPlayer = Math.abs(chunkQ - playerChunkQ) + Math.abs(chunkR - playerChunkR);
        
        // Calculate lateral (horizontal) distance in world coordinates
        const chunkWorldCenter = window.axialToCartesian(chunkQ * chunkSize + chunkSize/2, chunkR * chunkSize + chunkSize/2, window.tileSize);
        const playerPos = player ? player.position : (window.__cinematicPlayerPos || { x: 0, z: 0 });
        const lateralDistance = Math.sqrt(
          Math.pow(chunkWorldCenter.x - playerPos.x, 2) + 
          Math.pow(chunkWorldCenter.z - playerPos.z, 2)
        );
        const maxLateralDistance = MAX_CHUNK_DISTANCE_FROM_PLAYER * chunkSize * window.tileSize;
        
        // Only load chunks that are close to player OR in view AND within lateral distance limit
        const inView = isChunkInView(chunkQ, chunkR);
        const closeToPlayer = distToPlayer <= 1;
        const withinLateralDistance = lateralDistance <= maxLateralDistance;
        
        if ((inView || closeToPlayer) && withinLateralDistance) {
          const distToCamera = Math.abs(dq) + Math.abs(dr);
          chunksToLoad.push({ chunkQ, chunkR, distance: distToCamera });
        }
      }
    }
  }
  chunksToLoad.sort((a,b)=>a.distance-b.distance).forEach(({chunkQ, chunkR})=>{ if (!chunkLoadQueue.some(c => c.chunkQ===chunkQ && c.chunkR===chunkR)) chunkLoadQueue.push({chunkQ, chunkR}); });
  for (let i=0; i<MAX_CHUNKS_PER_FRAME && chunkLoadQueue.length>0; i++) { const {chunkQ, chunkR} = chunkLoadQueue.shift(); loadChunk(chunkQ, chunkR); }
  for (const [key, chunk] of loadedChunks) {
    const [cq, cr] = key.split(',').map(Number);
    const distToCamera = Math.abs(cq - cameraChunkQ) + Math.abs(cr - cameraChunkR);
    const distToPlayer = Math.abs(cq - playerChunkQ) + Math.abs(cr - playerChunkR);
    if (distToCamera > searchRadius && !isChunkInView(cq, cr) && distToPlayer > 1) unloadChunk(cq, cr);
  }
  for (const [key, chunk] of loadedChunks) {
    const [cq, cr] = key.split(',').map(Number);
    // Only set visibility for fully loaded chunks (skip loading markers)
    if (chunk.group && !chunk.loading) {
      const distToPlayer = Math.abs(cq - playerChunkQ) + Math.abs(cr - playerChunkR);
      
      // During cinematic, force city chunks to stay visible
      if (window.__forceCityChunksVisible) {
        console.log(`[CHUNK-VISIBILITY-DEBUG] __forceCityChunksVisible is active, checking chunk ${key}`);
        // Check if this chunk contains city tiles by checking if it was force-loaded
        const chunkStartQ = cq * chunkSize;
        const chunkStartR = cr * chunkSize;
        let isCityChunk = false;
        
        if (window.CITIES) {
          for (const city of window.CITIES) {
            const cityHex = window.cartesianToAxial(city.x, city.z, window.tileSize || 2);
            const cityRadius = Math.ceil(city.radius / (window.tileSize || 2));
            
            if (Math.abs(chunkStartQ - cityHex.q) <= cityRadius + chunkSize &&
                Math.abs(chunkStartR - cityHex.r) <= cityRadius + chunkSize) {
              isCityChunk = true;
              break;
            }
          }
        }
        
        if (isCityChunk) {
          chunk.group.visible = true;
          console.log(`[CHUNK-VISIBILITY-DEBUG] Forcing city chunk ${key} visible during cinematic`);
        } else {
          chunk.group.visible = distToPlayer <= 1 || isChunkInView(cq, cr);
        }
      } else {
        chunk.group.visible = distToPlayer <= 1 || isChunkInView(cq, cr);
      }
    }
  }
}
window.updateChunks = updateChunks;
window.loadChunk = loadChunk;
window.unloadChunk = unloadChunk;
window.reloadVisibleChunks = function reloadVisibleChunks() {
  const keys = Array.from(loadedChunks.keys());
  loadedChunks.forEach(chunk => { chunk.destroy && chunk.destroy(); scene.remove(chunk.group); });
  loadedChunks.clear();
  setTimeout(() => {
    const { q: playerQ, r: playerR } = window.cartesianToAxial(player.position.x, player.position.z, window.tileSize);
    updateChunks(playerQ, playerR);
  }, 0);
};

function findOpenSpotInCity(city) {
  const tile = window.tileSize || 2;
  const colliders = Array.isArray(window.cityColliders) ? window.cityColliders : [];
  const center = new THREE.Vector3(city.x, 0, city.z);
  introLog('findOpenSpotInCity', { city: { x: city.x, z: city.z, r: city.radius }, colliders: colliders.length });
  // scan rings within inner city
  for (let rad = Math.max(8, city.radius * 0.15); rad < Math.max(24, city.radius * 0.6); rad += 2) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      const x = center.x + Math.cos(a) * rad;
      const z = center.z + Math.sin(a) * rad;
      const g = window.cartesianToGrid(x, z, tile);
      const h = window.getCityHeight(g.x, g.y);
      const p = new THREE.Vector3(x, (Number.isFinite(h) ? h : 0), z);
      // ensure no collider overlaps
      const tooClose = colliders.some(c => {
        try { return c && c.box && c.box.distanceToPoint(new THREE.Vector3(p.x, p.y + 1.0, p.z)) < 1.2; } catch(_) { return false; }
      });
      if (!tooClose) { introLog('foundOpenSpot', { x: p.x, y: p.y, z: p.z, rad }); return { pos: new THREE.Vector3(p.x, (Number.isFinite(h) ? h : 0), p.z), height: (Number.isFinite(h) ? h : 0) }; }
    }
  }
  // fallback center using city height
  const g = window.cartesianToGrid(center.x, center.z, tile);
  const h = window.getCityHeight(g.x, g.y);
  const Y = Number.isFinite(h) ? h : 0;
  introLog('fallbackOpenSpot', { x: center.x, y: Y, z: center.z });
  return { pos: new THREE.Vector3(center.x, Y, center.z), height: Y };
}

function runIntroIfNeeded() {
  // INTRO COMPLETELY REMOVED - No cinematic, start game immediately
  console.log('[INTRO-DEBUG] Intro cinematic removed - starting game directly');
  
  // Set all completion flags
  __introDone = true;
  window.__introRunning = false;
  window.__introInputLock = false;
  
  // Ensure player is visible immediately
  if (window.player) {
    window.player.visible = true;
  }
  
  // Unpause game immediately
  if (window.gameState) {
    window.gameState.paused = false;
  }
  
  // Clear any intro-related localStorage
  try {
    localStorage.setItem('ftd_intro_played', '1');
  } catch(_) {}
  
  return Promise.resolve();
}

function animate(currentTime) {
  requestAnimationFrame(animate);
  if (currentTime === undefined) currentTime = 0;
  if (frameCount < 3) { frameCount++; }
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  
  // Always render, even during intro for smooth animations
  if (deltaTime === 0 || deltaTime > 100 || isNaN(deltaTime)) { 
    if (renderer && scene && camera) renderer.render(scene, camera); 
    return; 
  }
  
  // During intro, just render and return
  if (window.__introInputLock) {
    if (renderer && scene && camera) renderer.render(scene, camera);
    return;
  }
  
  if (window.gameState && window.gameState.paused) { 
    if (renderer && scene && camera) renderer.render(scene, camera); 
    return; 
  }
  
  if (typeof window.tickPortals === 'function') { try { window.tickPortals(); } catch(_){ } }
  if (window.rotateLeftActive !== window.rotateRightActive) {
    const deltaRad = (deltaTime / 1000) * window.CAMERA_ROTATION_SPEED * (window.rotateRightActive ? 1 : -1);
    window.cameraRotation += deltaRad;
    if (window.cameraRotation > Math.PI * 2) window.cameraRotation -= Math.PI * 2;
    if (window.cameraRotation < 0) window.cameraRotation += Math.PI * 2;
    window.updateCameraOffset();
  }
  
  // Use the refactored player movement
  if (window.updatePlayerMovement) window.updatePlayerMovement(deltaTime);
  
  // Apply bobbing AFTER movement has established the ground position
  if (window.applyPlayerBobbing) window.applyPlayerBobbing();
  
  try { updateSelectedRing && updateSelectedRing(); } catch(_) {}
  try { if (typeof window.updateCompass === 'function') window.updateCompass(); } catch(_) {}
  try { if (window.citizenSystem && window.citizenSystem.tickCitizens) window.citizenSystem.tickCitizens(deltaTime); } catch(_) {}
  try { if (window.droneSystem && window.droneSystem.tick) window.droneSystem.tick(deltaTime); } catch(_) {}
  try { if (window.resourceSystem && window.resourceSystem.tick) window.resourceSystem.tick(deltaTime); } catch(_) {}
     if (window.combatSystem && window.combatSystem.updateCombat) { window.combatSystem.updateCombat(deltaTime, scene, player, camera); }
   if (renderer && scene && camera) renderer.render(scene, camera);
}

function setSpawnNearLargestCity() {
  if (!window.CITIES || !window.CITIES.length) { player.position.set(0, 1, 0); targetPlayerY = 1; return; }
  const largest = window.CITIES.reduce((a,b)=> (a.radius > b.radius ? a : b));
  const angle = Math.random() * Math.PI * 2;
  const distance = largest.radius + 100;
  const spawnX = largest.x + Math.cos(angle) * distance;
  const spawnZ = largest.z + Math.sin(angle) * distance;
  const { x: gx, y: gy } = window.cartesianToGrid(spawnX, spawnZ, window.tileSize);
  const tileHeight = (window.CITY_TILE_OVERRIDES.get(`${gx},${gy}`)?.height) || window.getHeight(gx, gy);
  const spawnHeight = Math.max(tileHeight + window.PLAYER_Y_OFFSET, 1.0);
  player.position.set(spawnX, spawnHeight, spawnZ);
  targetPlayerY = spawnHeight;
}

function setSelectedEnemy(enemy) {
  try {
    if (window.selectedRing && window.selectedRing.parent) {
      window.selectedRing.parent.remove(window.selectedRing);
    }
  } catch (_) {}
  window.selectedRing = null;
  window.selectedEnemy = enemy && enemy.alive ? enemy : null;
  // Toggle auto-fire based on selection
  try {
    if (window.combatSystem && window.combatSystem.combatState) {
      window.combatSystem.combatState.autoFire = !!window.selectedEnemy;
    }
  } catch(_){}
  if (window.selectedEnemy && window.selectedEnemy.mesh) {
    try {
      const ringGeom = new THREE.RingGeometry(0.7, 0.9, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(window.selectedEnemy.mesh.position.x, window.selectedEnemy.mesh.position.y + 0.02, window.selectedEnemy.mesh.position.z);
      scene.add(ring);
      window.selectedRing = ring;
    } catch (_) {}
  }
}

function pointerOverUIButton(target) {
  if (!target) return false;
  // Ignore clicks on known UI/button elements
  const id = target.id || '';
  const classes = target.className || '';
      const uiIds = new Set(['debugExportBtn','fullscreenBtn','btnAction','btnBuild','btnMenu','btnSprint','craftMenu','gameMenu','buildTime','rotateCamLeft','rotateCamRight']);
  if (uiIds.has(id)) return true;
        if (String(classes).includes('mobileBtn')) return true;
  // Check if within HUD container
  let el = target;
  while (el) {
    if (el.id === 'hud' || el.id === 'gameMenu' || el.id === 'craftMenu') return true;
    el = el.parentElement;
  }
  return false;
}

function pickEnemyUnderPointer(clientX, clientY) {
  if (!window.combatSystem || !window.combatSystem.combatState || !camera || !renderer) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const enemyMeshes = window.combatSystem.combatState.enemies.filter(e=>e.alive && e.mesh).map(e=>e.mesh);
  const inter = raycaster.intersectObjects(enemyMeshes, false);
  if (inter && inter.length) {
    const hitMesh = inter[0].object;
    const enemy = window.combatSystem.combatState.enemies.find(e => e.mesh === hitMesh);
    return enemy || null;
  }
  return null;
}

(function setupTargetSelection(){
  function onPointerDown(e) {
    const target = e.target;
    if (pointerOverUIButton(target)) return;
    const enemy = pickEnemyUnderPointer(e.clientX, e.clientY);
    if (enemy) {
      setSelectedEnemy(enemy);
    } else {
      setSelectedEnemy(null);
    }
  }
  window.addEventListener('mousedown', onPointerDown, { passive: true });
  window.addEventListener('touchstart', (ev) => {
    try {
      const t = ev.touches && ev.touches[0];
      if (!t) return;
      const target = ev.target;
      if (pointerOverUIButton(target)) return;
      const enemy = pickEnemyUnderPointer(t.clientX, t.clientY);
      if (enemy) setSelectedEnemy(enemy); else setSelectedEnemy(null);
    } catch(_) {}
  }, { passive: true });
})();

function updateSelectedRing() {
  try {
    if (window.selectedEnemy && window.selectedEnemy.alive && window.selectedRing) {
      const p = window.selectedEnemy.mesh.position;
      window.selectedRing.position.set(p.x, p.y + 0.02, p.z);
    } else if (window.selectedEnemy && !window.selectedEnemy.alive) {
      setSelectedEnemy(null);
    }
  } catch(_) {}
}

function initGame() {

  window.gameState = { paused: false };
  

  initThreeJS();
  
  if (window.menuSystem) window.menuSystem.init();
  window.setupUI();
  // Apply initial sizing before intro displays to avoid tiny canvas/blue dot
  try { if (window.resizeGame) { window.resizeGame(); } if (window.checkOrientation) { window.checkOrientation(); } } catch(_) {}
  // Create player shadow disc
  try {
    const geo = new THREE.CircleGeometry(0.55, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
    playerShadow = new THREE.Mesh(geo, mat);
    playerShadow.rotation.x = -Math.PI / 2;
    playerShadow.renderOrder = 2;
    scene.add(playerShadow);
    window.playerShadow = playerShadow;
  } catch(_) {}
  

  runIntroIfNeeded().then(()=>{ 

    startGameplaySystems(); 
  });
}

function startGameplaySystems() {


  
  // Now that intro is done, start loading terrain chunks around the player
  if (player) {
    const spawnHex = window.cartesianToAxial(player.position.x, player.position.z, window.tileSize);

    updateChunks(spawnHex.q, spawnHex.r);
  } else {

  }

  // Initialize combat and bind controls (restores aiming reticule and firing)
  if (window.combatSystem && typeof window.combatSystem.initCombat === 'function') {
    try { window.combatSystem.initCombat(scene, player, camera); } catch (_) {}
    window.addEventListener('keydown', (e) => {
      if (!window.combatSystem) return;
      if (e.repeat) return; // Ignore key repeats to prevent multiple toggles
      // Space now jumps instead of toggling autofire
      if (e.code === 'Space') { try { if (window.startJump) window.startJump(); } catch(_){} return; }
      if (e.code === 'Digit1') window.combatSystem.placeBuilding('hexBlock', scene, player, window.facingDirection || 0);
      if (e.code === 'Digit2') window.combatSystem.placeBuilding('ramp', scene, player, window.facingDirection || 0);
      if (e.code === 'Digit3') window.combatSystem.placeBuilding('turret', scene, player, window.facingDirection || 0);
      if (e.code === 'Digit4') window.combatSystem.placeBuilding('synthesizer', scene, player, window.facingDirection || 0);
      if (e.code === 'Digit5') window.combatSystem.placeBuilding('chargeConduit', scene, player, window.facingDirection || 0);
      if (e.code === 'Digit6') window.combatSystem.placeBuilding('shield', scene, player, window.facingDirection || 0);
      if (e.code === 'KeyC') { window.combatSystem.toggleCraftMenu(); }
    });
  }

  if (typeof setupCameraRotation === 'function') setupCameraRotation();
  const gameArea = document.getElementById('gameArea');
  if (gameArea) {
    const existing = gameArea.querySelector('canvas');
    if (existing) existing.remove();
    gameArea.appendChild(renderer.domElement);
  }
  window.resizeGame(); window.checkOrientation();

  
  // Enable touch controls when the environment supports touch or coarse pointer, regardless of UA
  try {
    const enableTouch = (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
    if (enableTouch && typeof setupTouchControls === 'function') {
      setupTouchControls();
      if (typeof preventDefaultTouchBehaviors==='function') preventDefaultTouchBehaviors();
    }
  } catch(_) {}
  animate(0);
}

// Strengthen orientation handling on resize
window.addEventListener('resize', () => { window.checkOrientation && window.checkOrientation(); });
window.initGame = initGame; 

function applyWorldState() {
  try {
    // Apply tile raises
    if (window.__tileRaises) {
      const raises = window.__tileRaises;
      Object.keys(raises).forEach((key) => {
        const [q, r] = key.split(',').map(Number);
        const existing = window.CITY_TILE_OVERRIDES.get(`${q},${r}`) || { height: window.getHeight(q, r) };
        const inc = raises[key] || 0;
        window.CITY_TILE_OVERRIDES.set(`${q},${r}`, { height: (existing.height || 0) + inc });
      });
      // Refresh visible chunks
      window.reloadVisibleChunks && window.reloadVisibleChunks();
    }
    // Render buildings with health and selection
    // Remove previous
    try { if (window.__buildingMeshes && window.__buildingMeshes.length) { window.__buildingMeshes.forEach(m => { try { scene.remove(m.mesh); } catch(_){} }); } } catch(_){ }
    window.__buildingMeshes = [];
    (window.__worldBuildings || []).forEach((b) => {
      // Simple shape per type; ensure selection/health
      let geo = new THREE.BoxGeometry(2, 2, 2);
      if (b.type === 'ramp') geo = new THREE.BoxGeometry(2, 1, 4);
      if (b.type === 'turret') geo = new THREE.CylinderGeometry(0.8, 1, 3, 10);
      if (b.type === 'synthesizer') geo = new THREE.OctahedronGeometry(1.2, 0);
      if (b.type === 'chargeConduit') geo = new THREE.ConeGeometry(0.8, 3, 8);
      if (b.type === 'shield') geo = new THREE.SphereGeometry(1.2, 10, 10);
      if (b.type === 'raiseTile') geo = new THREE.BoxGeometry(2, 0.6, 2);
      const mat = new THREE.MeshPhongMaterial({ color: 0x999999, emissive: 0x111111, emissiveIntensity: 0.1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.y, b.z);
      mesh.userData.buildingId = b.id;
      scene.add(mesh);
      window.__buildingMeshes.push({ id: b.id, mesh, data: b });
    });
  } catch(_) {}
}
window.applyWorldState = applyWorldState;

(function setupCitizenTalk(){
  function onPointerDown(e){
    try {
      if (!window.citizenSystem) return;
      const target = e.target; if (pointerOverUIButton && pointerOverUIButton(target)) return;
      const c = window.citizenSystem.pickCitizenUnderPointer(e.clientX, e.clientY);
      if (c) {
        // Check if this is a shop NPC first
        if (window.shopSystem && window.shopSystem.handleShopNPCClick(c)) {
          return; // Shop interaction handled
        }
        // Otherwise, normal citizen talk
        window.citizenSystem.talkToCitizen(c);
      }
    } catch(_){}
  }
  window.addEventListener('mousedown', onPointerDown, { passive: true });
  window.addEventListener('keydown', (e)=>{
    if (e.code === 'KeyT') {
      try { 
        const c = window.citizenSystem && window.citizenSystem.nearestCitizenToPlayer ? window.citizenSystem.nearestCitizenToPlayer(3.0) : null; 
        if (c) {
          // Check if this is a shop NPC first
          if (window.shopSystem && window.shopSystem.handleShopNPCClick(c)) {
            return; // Shop interaction handled
          }
          // Otherwise, normal citizen talk
          window.citizenSystem.talkToCitizen(c);
        }
      } catch(_){}
    }
  });
})();