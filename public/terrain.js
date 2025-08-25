// Terrain generation and height calculation

// Terrain config
const tileSize = 2;
const gridSize = parseInt(window.paramValue('radius', 10));
window.tileSize = tileSize;

// Player vertical offset above ground
const PLAYER_Y_OFFSET = 0.6;
window.PLAYER_Y_OFFSET = PLAYER_Y_OFFSET;
window.CHARACTER_Y_OFFSET = (typeof window.CHARACTER_Y_OFFSET === 'number') ? window.CHARACTER_Y_OFFSET : PLAYER_Y_OFFSET;

// Noise params
const seedParam = parseInt(window.paramValue('seed', 12345));
const baseFreq = parseFloat(window.paramValue('base', 0.05));
const warpFreq = parseFloat(window.paramValue('warp', 0.1));
const warpAmp = parseFloat(window.paramValue('amp', 5));
const flatness = Math.max(0, Math.min(1, parseFloat(window.paramValue('flat', 1))));
const borderHeight = parseFloat(window.paramValue('border', 3));
const outlineMode = parseInt(window.paramValue('outline', 0)) === 1;
// Ridged mountain layer (impassable high ridges)
const ridgeFreq = parseFloat(window.paramValue('ridgeFreq', 0.003));
const ridgeAmp = parseFloat(window.paramValue('ridgeAmp', 28));
const ridgeSharp = parseFloat(window.paramValue('ridgeSharp', 3.0));
const ridgeThresh = parseFloat(window.paramValue('ridgeThresh', 0.6));
window.outlineMode = outlineMode;

// Height cache
const heightCache = new Map();

function noise2(x, z) { 
  return window.simplex ? window.simplex.noise2D(x, z) : 0; 
}

function getHeight(q, r) {
  const key = `${q},${r}`; 
  if (heightCache.has(key)) return heightCache.get(key);
  
  const cart = window.axialToCartesian(q, r, tileSize);
  const wx = noise2(cart.x * warpFreq, cart.z * warpFreq) * warpAmp;
  const wz = noise2((cart.x + 1000) * warpFreq, (cart.z + 1000) * warpFreq) * warpAmp;
  const n = noise2((cart.x + wx) * baseFreq, (cart.z + wz) * baseFreq);
  let h = 1.5 + n * 2 * flatness;
  
  // Second-layer mountain ridges: very high ridged noise walls for variety and impassable barriers
  try {
    const rnx = noise2(cart.x * ridgeFreq, cart.z * ridgeFreq);
    let ridge = 1 - Math.abs(rnx); // peaks where noise crosses zero -> long ridges
    ridge = Math.pow(Math.max(0, ridge), ridgeSharp);
    const mask = ridge > ridgeThresh ? (ridge - ridgeThresh) / (1 - ridgeThresh) : 0;
    h += mask * ridgeAmp;
  } catch(_) {}
  
  const borderNoise = noise2(q * 0.002, r * 0.002);
  const borderThreshold = 800 + borderNoise * 400;
  const dist = Math.sqrt(q*q + r*r);
  if (dist > borderThreshold) {
    const borderFactor = (dist - borderThreshold) / 200;
    h += Math.pow(borderFactor, 2) * borderHeight * 10;
  }
  
  heightCache.set(key, h);
  return h;
}
window.getHeight = getHeight;

// City overrides
const CITY_TILE_OVERRIDES = new Map();
window.CITY_TILE_OVERRIDES = CITY_TILE_OVERRIDES;

function getCityHeight(q, r) {
  const ov = CITY_TILE_OVERRIDES.get(`${q},${r}`);
  return (ov && ov.height !== undefined) ? ov.height : null;
}
window.getCityHeight = getCityHeight;

// Unified ground height sampler at a world (x,z)
function sampleGroundHeightAt(x, z) {
  try {
    const gx = x / (window.tileSize || 2);
    const gz = z / (window.tileSize || 2);
    const q0 = Math.floor(gx), r0 = Math.floor(gz);
    const fx = gx - q0, fz = gz - r0;
    
    function tileHeight(q, r) {
      let h = null;
      try { h = window.getCityHeight(q, r); } catch(_){ }
      if (!Number.isFinite(h)) { 
        try { h = window.getHeight(q, r); } catch(_){}
      }
      return Number.isFinite(h) ? h : 0;
    }
    
    // If any of the four sample tiles are city overrides, avoid blending and use the current tile's height
    const ov = (window.CITY_TILE_OVERRIDES instanceof Map) ? window.CITY_TILE_OVERRIDES : null;
    const hasOverride = !!(ov && (
      ov.has(`${q0},${r0}`) || ov.has(`${q0+1},${r0}`) || 
      ov.has(`${q0},${r0+1}`) || ov.has(`${q0+1},${r0+1}`)
    ));
    
    if (hasOverride) {
      return tileHeight(q0, r0);
    }
    
    const h00 = tileHeight(q0, r0);
    const h10 = tileHeight(q0 + 1, r0);
    const h01 = tileHeight(q0, r0 + 1);
    const h11 = tileHeight(q0 + 1, r0 + 1);
    const hx0 = h00 * (1 - fx) + h10 * fx;
    const hx1 = h01 * (1 - fz) + h11 * fz;
    const h = hx0 * (1 - fz) + hx1 * fz;
    return h;
  } catch(_) { 
    return null; 
  }
}
window.sampleGroundHeightAt = sampleGroundHeightAt;

// Materials
function getHeightBasedMaterial(height) {
  const normalized = Math.max(0, Math.min(1, (height + 5) / 15));
  const purple = new THREE.Color(0x6633aa);
  const green = new THREE.Color(0x33aa66);
  const color = purple.clone().lerp(green, normalized);
  
  return window.isMobileDevice() ?
    new THREE.MeshPhongMaterial({ 
      color, 
      emissive: color.clone().multiplyScalar(0.25), 
      shininess: 20, 
      wireframe: outlineMode, 
      flatShading: true, 
      side: THREE.FrontSide 
    }) :
    new THREE.MeshStandardMaterial({ 
      color, 
      emissive: color.clone().multiplyScalar(0.15), 
      metalness: 0.2, 
      roughness: 0.8, 
      wireframe: outlineMode, 
      side: THREE.FrontSide 
    });
}

// Tile mesh factory
function createTileMesh(q, r, useLOD = false) {
  const { x, z } = window.axialToCartesian(q, r, tileSize);
  const overrideKey = `${q},${r}`;
  const override = CITY_TILE_OVERRIDES.get(overrideKey);
  

  
  let heightMultiplier = override && override.height !== undefined ? override.height : getHeight(q, r);
  
  if (heightMultiplier <= -50) return { geo: null, wire: null };
  
  const towerHeight = Math.max(0.5, heightMultiplier);
  const tileMaterial = override && override.material ? override.material : getHeightBasedMaterial(heightMultiplier);
  
  if (useLOD && window.isMobileDevice()) {
    const boxGeo = new THREE.BoxGeometry(tileSize, towerHeight, tileSize);
    boxGeo.translate(x, towerHeight / 2, z);
    boxGeo.userData = { mat: tileMaterial };
    return { geo: boxGeo, wire: null };
  }
  
  const topHalf = tileSize * 0.49; 
  const bottomHalf = tileSize * 0.5; 
  const yTopEps = 0.001;
  const positions = []; 
  const indices = []; 
  let baseIndex = 0;
  
  function addQuad(v0, v1, v2, v3, idxOrder) {
    positions.push(
      v0[0], v0[1], v0[2], v1[0], v1[1], v1[2], 
      v2[0], v2[1], v2[2], v3[0], v3[1], v3[2]
    );
    for (let k = 0; k < idxOrder.length; k++) indices.push(baseIndex + idxOrder[k]);
    baseIndex += 4;
  }
  
  // top
  addQuad(
    [-topHalf, towerHeight, -topHalf], [ topHalf, towerHeight, -topHalf],
    [-topHalf, towerHeight,  topHalf], [ topHalf, towerHeight,  topHalf],
    [0, 2, 1, 2, 3, 1]
  );
  
  const neighbors = [ 
    { q: q+1, r }, { q, r: r-1 }, 
    { q: q-1, r }, { q, r: r+1 } 
  ];
  
  const neighborHeights = neighbors.map(n => {
    const ovr = CITY_TILE_OVERRIDES.get(`${n.q},${n.r}`);
    return (ovr && ovr.height !== undefined) ? ovr.height : getHeight(n.q, n.r);
  });
  
  const faceNormals = [ 
    new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,-1), 
    new THREE.Vector3(-1,0,0), new THREE.Vector3(0,0,1) 
  ];
  
  for (let i = 0; i < 4; i++) {
    const drop = neighborHeights[i] < (towerHeight - 0.01);
    if (!drop) continue;
    
    let v0, v1, v2, v3;
    if (i === 0) { 
      v0 = new THREE.Vector3( bottomHalf, 0,  topHalf); 
      v1 = new THREE.Vector3( bottomHalf, 0, -topHalf); 
      v2 = new THREE.Vector3(   topHalf,  towerHeight - yTopEps,  topHalf); 
      v3 = new THREE.Vector3(   topHalf,  towerHeight - yTopEps, -topHalf); 
    }
    else if (i === 1) { 
      v0 = new THREE.Vector3(  topHalf, 0, -bottomHalf); 
      v1 = new THREE.Vector3( -topHalf, 0, -bottomHalf); 
      v2 = new THREE.Vector3(  topHalf,  towerHeight - yTopEps, -topHalf); 
      v3 = new THREE.Vector3( -topHalf,  towerHeight - yTopEps, -topHalf); 
    }
    else if (i === 2) { 
      v0 = new THREE.Vector3( -bottomHalf, 0, -topHalf); 
      v1 = new THREE.Vector3( -bottomHalf, 0,  topHalf); 
      v2 = new THREE.Vector3(  -topHalf,   towerHeight - yTopEps, -topHalf); 
      v3 = new THREE.Vector3(  -topHalf,   towerHeight - yTopEps,  topHalf); 
    }
    else { 
      v0 = new THREE.Vector3( -topHalf, 0,  bottomHalf); 
      v1 = new THREE.Vector3(  topHalf, 0,  bottomHalf); 
      v2 = new THREE.Vector3( -topHalf,  towerHeight - yTopEps,  topHalf); 
      v3 = new THREE.Vector3(  topHalf,  towerHeight - yTopEps,  topHalf); 
    }
    
    const expected = faceNormals[i];
    const e1 = new THREE.Vector3().subVectors(v1, v0);
    const e2 = new THREE.Vector3().subVectors(v2, v0);
    const normal = new THREE.Vector3().crossVectors(e1, e2).normalize();
    const useForward = normal.dot(expected) > 0;
    const idxOrder = useForward ? [0,1,2, 1,3,2] : [0,2,1, 2,3,1];
    
    positions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
    for (let k = 0; k < idxOrder.length; k++) indices.push(baseIndex + idxOrder[k]);
    baseIndex += 4;
  }
  
  const combinedGeo = new THREE.BufferGeometry();
  combinedGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  combinedGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
  combinedGeo.computeVertexNormals();
  combinedGeo.translate(x, 0, z);
  combinedGeo.userData = { mat: tileMaterial };
  
  return { geo: combinedGeo, wire: null };
}
window.createTileMesh = createTileMesh;

