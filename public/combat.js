// FAILURE_TO_DIE - Level 2 Combat & Gameplay Systems
// This module adds combat, enemies, buildings, and crafting to the base game

// Global combat state
const combatState = {
  projectiles: [],
  enemies: [],
  buildings: [],
  playerStats: {
    integrity: 100,
    maxIntegrity: 100,
    charge: 100,
    maxCharge: 100,
    score: 0,
    kills: 0,
    resources: {
      hexDust: 0,
      luminGrain: 0,
      synthFibers: 0,
      kineStrand: 0,
      voidResidue: 0,
      cryoShards: 0,
      pyroFilament: 0,
      voltCoil: 0
    },
    equipment: {
      weapon: 'kineticProjector',
      armor: null,
      utility: null
    },
    weaponCooldown: 0,
    selectedBuilding: null
  },
  autoFire: false
};

// Enemy level and tag helpers
function computeEnemyLevelAtPosition(x, z, playerScore){
  try {
    const diff = getDifficultyAt(x, z);
    const base = 1 + Math.floor(diff * 20);
    const scoreBonus = Math.floor((playerScore||0) / 200);
    return Math.max(1, Math.min(50, base + scoreBonus));
  } catch(_) { return 1; }
}
function levelColorFor(delta){
  // Color by relative difficulty vs player level
  if (delta <= -3) return '#66ff66';       // trivial
  if (delta <= -1) return '#aaff66';       // easy
  if (delta === 0) return '#ffffff';       // even
  if (delta <= 2) return '#ffdd66';        // tough
  if (delta <= 4) return '#ff9966';        // dangerous
  return '#ff5566';                         // lethal
}
function makeEnemyNameTag(name, level, colorHex){
  try {
    const txt = `${name} Lv ${level}`;
    
    // Create a temporary canvas to measure text
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = 'bold 48px monospace';
    const textMetrics = tempCtx.measureText(txt);
    const textWidth = textMetrics.width;
    
    // Size canvas to fit text with minimal padding
    const padding = 20;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = Math.min(512, textWidth + padding * 2);
    canvas.height = 80; // Reduced height
    
    // Background with border
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = colorHex || '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // Text with outline for better visibility
    ctx.font = 'bold 48px monospace'; 
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle';
    
    // Text outline (black)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.strokeText(txt, canvas.width / 2, canvas.height / 2);
    
    // Main text
    ctx.fillStyle = colorHex || '#ffffff';
    ctx.fillText(txt, canvas.width / 2, canvas.height / 2);
    
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const spr = new THREE.Sprite(mat);
    // Scale based on actual canvas size
    spr.scale.set(canvas.width / 100, canvas.height / 100, 1);
    return spr;
  } catch(_) { return null; }
}

// Weapon definitions with RTS-style balance
const WEAPONS = {
  kineticProjector: {
    name: 'Kinetic Projector',
    damage: 15,
    range: 30,
    cooldown: 500,
    projectileSpeed: 0.8,
    chargeUse: 0,
    color: 0x00ffff,
    projectileType: 'ballistic',
    description: 'Physical rounds, no charge cost',
    accuracy: 0.8
  },
  energyDischarger: {
    name: 'Energy Discharger',
    damage: 25,
    range: 40,
    cooldown: 800,
    projectileSpeed: 1.2,
    chargeUse: 10,
    color: 0xff00ff,
    projectileType: 'laser',
    description: 'High damage, uses charge',
    accuracy: 0.95
  },
  plasmaCannon: {
    name: 'Plasma Cannon',
    damage: 40,
    range: 25,
    cooldown: 1500,
    projectileSpeed: 0.6,
    chargeUse: 20,
    color: 0xffaa00,
    projectileType: 'explosive',
    aoeRadius: 5,
    description: 'AOE damage, high charge cost',
    accuracy: 0.75
  },
  voidRifle: {
    name: 'Void Rifle',
    damage: 35,
    range: 50,
    cooldown: 1000,
    projectileSpeed: 2.0,
    chargeUse: 15,
    color: 0x8800ff,
    projectileType: 'piercing',
    description: 'Pierces through enemies',
    accuracy: 0.92
  },
  railgun: {
    name: 'Railgun',
    damage: 55,
    range: 60,
    cooldown: 1800,
    projectileSpeed: 3.5,
    chargeUse: 25,
    color: 0x99ccff,
    projectileType: 'piercing',
    description: 'Ultra-fast kinetic slug',
    accuracy: 0.9
  },
  shotgunScatter: {
    name: 'Scatter Shotgun',
    damage: 8,
    range: 18,
    cooldown: 600,
    projectileSpeed: 0.9,
    chargeUse: 0,
    color: 0xffcc99,
    projectileType: 'pellet',
    pellets: 6,
    spread: 0.12,
    description: 'Close-range multi-pellet blast',
    accuracy: 0.7
  },
  beamLance: {
    name: 'Beam Lance',
    damage: 18,
    range: 45,
    cooldown: 120,
    projectileSpeed: 0,
    chargeUse: 5,
    color: 0xffffff,
    projectileType: 'beam',
    description: 'Sustained beam, low per-tick damage',
    accuracy: 0.98
  },
  arcThrower: {
    name: 'Arc Thrower',
    damage: 14,
    range: 28,
    cooldown: 350,
    projectileSpeed: 1.2,
    chargeUse: 8,
    color: 0x66ccff,
    projectileType: 'chain',
    chains: 2,
    description: 'Chains to nearby targets',
    accuracy: 0.85
  },
  grenadeLauncher: {
    name: 'Grenade Launcher',
    damage: 28,
    range: 26,
    cooldown: 900,
    projectileSpeed: 0.7,
    chargeUse: 0,
    color: 0xff8844,
    projectileType: 'lobbed',
    aoeRadius: 3.5,
    description: 'Arcing explosive shots',
    accuracy: 0.8
  },
  sniperLaser: {
    name: 'Sniper Laser',
    damage: 45,
    range: 70,
    cooldown: 1400,
    projectileSpeed: 4.0,
    chargeUse: 18,
    color: 0xff66ff,
    projectileType: 'laser',
    description: 'High-precision long-range',
    accuracy: 0.98
  },
  pulseSMG: {
    name: 'Pulse SMG',
    damage: 10,
    range: 32,
    cooldown: 200,
    projectileSpeed: 1.6,
    chargeUse: 6,
    color: 0x66ffcc,
    projectileType: 'laser',
    description: 'Rapid fire, low damage per shot',
    accuracy: 0.86
  }
};

// Building types for RTS elements
const BUILDINGS = {
  hexBlock: {
    name: 'Hex Block',
    cost: { hexDust: 5, luminGrain: 2 },
    integrity: 100,
    model: 'block',
    color: 0x4444ff,
    height: 2,
    description: 'Basic defensive wall'
  },
  ramp: {
    name: 'Modular Ramp',
    cost: { hexDust: 8, synthFibers: 3 },
    integrity: 80,
    model: 'ramp',
    color: 0x44ff44,
    height: 1,
    description: 'Allows vertical movement'
  },
  tent: {
    name: 'Field Tent',
    cost: { hexDust: 12, synthFibers: 6 },
    integrity: 120,
    model: 'tent',
    color: 0x22ffaa,
    height: 4.5,
    safeRadius: 10,
    description: 'Safe shelter: low-level enemies wander off; safe logout zone'
  },
  turret: {
    name: 'Defense Turret',
    cost: { kineStrand: 10, voltCoil: 5 },
    integrity: 150,
    model: 'turret',
    color: 0xff4444,
    height: 3,
    damage: 10,
    range: 20,
    fireRate: 1000,
    description: 'Automated defense'
  },
  synthesizer: {
    name: 'Material Synthesizer',
    cost: { hexDust: 15, luminGrain: 10, synthFibers: 5 },
    integrity: 200,
    model: 'synthesizer',
    color: 0xffff44,
    height: 2,
    processRate: 5000,
    description: 'Processes materials'
  },
  chargeConduit: {
    name: 'Charge Conduit',
    cost: { luminGrain: 20, voidResidue: 10 },
    integrity: 100,
    model: 'conduit',
    color: 0x44ffff,
    height: 4,
    regenRadius: 15,
    regenRate: 2,
    description: 'Regenerates charge'
  },
  shield: {
    name: 'Shield Generator',
    cost: { voltCoil: 15, cryoShards: 10 },
    integrity: 120,
    model: 'shield',
    color: 0x00ffff,
    height: 3,
    shieldRadius: 10,
    shieldStrength: 50,
    description: 'Area shield protection'
  },
  raiseTile: {
    name: 'Tile Raise',
    cost: { hexDust: 20, synthFibers: 8 },
    integrity: 50,
    model: 'raise',
    color: 0xbbbbbb,
    height: 0.6,
    buildTimeMs: 4000,
    description: 'Permanently raises the target tile by +1 height (persistent)'
  }
};

// Extend with additional blueprint buildings
Object.assign(BUILDINGS, {
  hexWall: { name: 'Hex Wall', cost: { hexDust: 6, luminGrain: 2 }, integrity: 140, model: 'block', color: 0x3366cc, height: 2.2, description: 'Sturdy defensive wall' },
  barricade: { name: 'Barricade', cost: { hexDust: 4, synthFibers: 2 }, integrity: 80, model: 'block', color: 0x888888, height: 1.2, description: 'Quick cover' },
  watchTower: { name: 'Watch Tower', cost: { hexDust: 10, synthFibers: 6 }, integrity: 160, model: 'turret', color: 0x99ccff, height: 4, description: 'Elevated vantage; no fire' },
  healingTotem: { name: 'Healing Totem', cost: { synthFibers: 8, luminGrain: 12 }, integrity: 120, model: 'shield', color: 0x66ff99, height: 2.2, healRadius: 10, healPerSec: 1.2, description: 'Regenerates integrity in area' },
  slowField: { name: 'Slow Field', cost: { cryoShards: 8, voidResidue: 6 }, integrity: 100, model: 'conduit', color: 0x88ddff, height: 2, slowRadius: 12, slowFactor: 0.6, description: 'Slows enemies in radius' },
  spikeTrap: { name: 'Spike Trap', cost: { hexDust: 10, pyroFilament: 4 }, integrity: 60, model: 'block', color: 0xcc4444, height: 0.6, trapRadius: 2.5, trapDps: 6, description: 'Damages nearby enemies' },
  plasmaTurret: { name: 'Plasma Turret', cost: { kineStrand: 12, voltCoil: 8 }, integrity: 150, model: 'turret', color: 0xff8800, height: 3, damage: 16, range: 22, fireRate: 900, damageType: 'plasma', description: 'Plasma bolts' },
  flameTurret: { name: 'Flame Turret', cost: { pyroFilament: 12, synthFibers: 6 }, integrity: 140, model: 'turret', color: 0xff5533, height: 3, damage: 12, range: 16, fireRate: 500, damageType: 'heat', description: 'Short-range burner' },
  frostTower: { name: 'Frost Tower', cost: { cryoShards: 12, luminGrain: 6 }, integrity: 130, model: 'turret', color: 0x66ccff, height: 3, damage: 9, range: 20, fireRate: 800, damageType: 'cryo', slowOnHit: 0.8, description: 'Slows on hit' },
  shockEmitter: { name: 'Shock Emitter', cost: { voltCoil: 12, voidResidue: 6 }, integrity: 120, model: 'turret', color: 0x99ffff, height: 2.8, damage: 13, range: 18, fireRate: 700, damageType: 'electric', description: 'Electric pulses' },
  resourceHarvester: { name: 'Resource Harvester', cost: { hexDust: 18, synthFibers: 10 }, integrity: 160, model: 'synthesizer', color: 0x66ff66, height: 2, harvestBoostRadius: 18, boost: 1.8, description: 'Boosts harvest regrowth' },
  lightBeacon: { name: 'Light Beacon', cost: { luminGrain: 14, voidResidue: 4 }, integrity: 100, model: 'shield', color: 0xffffaa, height: 3.5, description: 'Illuminates area' },
  droneCharger: { name: 'Drone Charger', cost: { voltCoil: 14, synthFibers: 6 }, integrity: 140, model: 'conduit', color: 0xaaffff, height: 2.2, chargeRadius: 12, fireRateScale: 0.7, description: 'Boosts nearby drones fire-rate' },
  radarBeacon: { name: 'Radar Beacon', cost: { voidResidue: 10, luminGrain: 8 }, integrity: 120, model: 'shield', color: 0xaaccff, height: 2.4, pingRadius: 25, description: 'Pings enemies periodically' },
  speedPad: { name: 'Speed Pad', cost: { kineStrand: 8, synthFibers: 8 }, integrity: 90, model: 'block', color: 0x88ffaa, height: 0.4, speedRadius: 6, speedMult: 1.4, description: 'Boosts movement speed in area' }
});

// Enemy types with varied behaviors - GameStop/DRS themed
const ENEMY_TYPES = {
  // Basic melee enemy - represents retail shorts
  shill: {
    name: 'Shill Bot',
    integrity: 30,
    speed: 0.03,
    damage: 10,
    attackRange: 2,
    attackCooldown: 2000,
    color: 0x666666,
    size: 0.8,
    score: 10,
    drops: { hexDust: 2, luminGrain: 1 },
    behavior: 'melee',
    damageType: 'kinetic',
    modelType: 'cone', // Basic cone shape
    movementPattern: 'direct' // Moves straight at player
  },
  
  // Fast aggressive enemy - represents day traders
  paperhand: {
    name: 'Paperhand',
    integrity: 25,
    speed: 0.08,
    damage: 8,
    attackRange: 2,
    attackCooldown: 1000,
    color: 0xffaa00,
    size: 0.7,
    score: 15,
    drops: { synthFibers: 2, kineStrand: 1 },
    behavior: 'hit_and_run',
    damageType: 'kinetic',
    modelType: 'octahedron', // Diamond-like shape
    movementPattern: 'zigzag' // Erratic movement
  },
  
  // Ranged enemy - represents media FUD
  fudster: {
    name: 'FUD Spreader',
    integrity: 40,
    speed: 0.04,
    damage: 15,
    attackRange: 12,
    attackCooldown: 1500,
    color: 0xff0000,
    size: 1.0,
    score: 25,
    drops: { voidResidue: 2, voltCoil: 1 },
    behavior: 'ranged',
    damageType: 'plasma',
    modelType: 'cylinder', // Turret-like
    movementPattern: 'strafe' // Circles while shooting
  },
  
  // Tank enemy - represents market makers
  marketmaker: {
    name: 'Market Maker',
    integrity: 150,
    speed: 0.02,
    damage: 30,
    attackRange: 3,
    attackCooldown: 2500,
    color: 0x000088,
    size: 1.8,
    score: 50,
    drops: { cryoShards: 3, pyroFilament: 2 },
    behavior: 'siege',
    targetBuildings: true,
    damageType: 'kinetic',
    modelType: 'box', // Bulky cube shape
    movementPattern: 'bulldoze' // Slow but unstoppable
  },
  
  // Flying enemy - represents high-frequency traders
  algobot: {
    name: 'Algo Trader',
    integrity: 35,
    speed: 0.07,
    damage: 12,
    attackRange: 8,
    attackCooldown: 800,
    color: 0x00ff00,
    size: 0.9,
    score: 30,
    drops: { luminGrain: 3, voltCoil: 2 },
    behavior: 'flying',
    flyHeight: 4,
    damageType: 'electric',
    modelType: 'tetrahedron', // Pyramid shape
    movementPattern: 'hover_strafe' // Flies and strafes
  },
  
  // Stealth enemy - represents dark pool traders
  darkpool: {
    name: 'Dark Pool',
    integrity: 45,
    speed: 0.05,
    damage: 20,
    attackRange: 2,
    attackCooldown: 1800,
    color: 0x440044,
    size: 1.1,
    score: 40,
    drops: { voidResidue: 4, synthFibers: 2 },
    behavior: 'stealth',
    damageType: 'void',
    modelType: 'sphere', // Orb shape
    movementPattern: 'phase', // Appears and disappears
    stealthDuration: 3000,
    visibleDuration: 2000
  },
  
  // Swarm enemy - represents synthetic shares
  synthetic: {
    name: 'Synthetic',
    integrity: 15,
    speed: 0.09,
    damage: 5,
    attackRange: 1.5,
    attackCooldown: 500,
    color: 0xffff00,
    size: 0.5,
    score: 8,
    drops: { hexDust: 1 },
    behavior: 'swarm',
    damageType: 'kinetic',
    modelType: 'small_cone', // Tiny cone
    movementPattern: 'swarm', // Moves in groups
    swarmSize: 5 // Spawns in groups
  },
  
  // Boss enemy - represents hedge fund managers
  hedgie: {
    name: 'Hedgie Boss',
    integrity: 300,
    speed: 0.03,
    damage: 50,
    attackRange: 5,
    attackCooldown: 3000,
    color: 0xff00ff,
    size: 2.5,
    score: 200,
    drops: { cryoShards: 8, pyroFilament: 5, voidResidue: 5 },
    behavior: 'boss',
    targetBuildings: true,
    damageType: 'plasma',
    modelType: 'complex', // Multi-part model
    movementPattern: 'tactical', // Smart AI movement
    specialAttack: 'aoe_slam', // Area damage attack
    specialCooldown: 5000
  },
  
  // Support enemy - represents paid bashers
  basher: {
    name: 'Forum Basher',
    integrity: 50,
    speed: 0.04,
    damage: 10,
    attackRange: 10,
    attackCooldown: 2000,
    color: 0x888800,
    size: 1.0,
    score: 20,
    drops: { synthFibers: 3, luminGrain: 2 },
    behavior: 'support',
    damageType: 'electric',
    modelType: 'cylinder', // Tower shape
    movementPattern: 'maintain_distance', // Keeps distance
    buffNearbyEnemies: true, // Makes other enemies stronger
    buffRadius: 10,
    buffAmount: 1.2
  },
  
  // Original enemies kept for compatibility
  script: {
    name: 'Short Script',
    integrity: 40,
    speed: 0.05,
    damage: 0,
    attackRange: 0,
    attackCooldown: 0,
    color: 0xffffff,
    size: 0.9,
    score: 30,
    drops: { luminGrain: 3 },
    behavior: 'flyingScript',
    damageType: 'electric',
    modelType: 'sprite', // Uses texture
    movementPattern: 'float'
  },
  script_phantom: {
    name: 'Phantom Share',
    integrity: 30,
    speed: 0.06,
    damage: 0,
    attackRange: 0,
    attackCooldown: 0,
    color: 0x9999ff,
    size: 0.9,
    score: 20,
    drops: { voidResidue: 2 },
    behavior: 'flyingFollower',
    damageType: 'electric',
    modelType: 'sprite', // Uses texture
    movementPattern: 'follow'
  }
};

// Crafting recipes
const RECIPES = {
  upgradeEnergy: {
    name: 'Energy Weapon',
    input: { synthFibers: 5, luminGrain: 10 },
    output: { weapon: 'energyDischarger' },
    time: 3000
  },
  upgradePlasma: {
    name: 'Plasma Cannon',
    input: { voidResidue: 10, kineStrand: 5, pyroFilament: 3 },
    output: { weapon: 'plasmaCannon' },
    time: 5000
  },
  upgradeVoid: {
    name: 'Void Rifle',
    input: { voidResidue: 15, voltCoil: 8, cryoShards: 5 },
    output: { weapon: 'voidRifle' },
    time: 6000
  },
  healingPack: {
    name: 'Healing Pack',
    input: { hexDust: 3, luminGrain: 2 },
    output: { healing: 25 },
    time: 1000
  },
  chargeCell: {
    name: 'Charge Cell',
    input: { luminGrain: 5, voltCoil: 1 },
    output: { charge: 50 },
    time: 1500
  },
  armorPlating: {
    name: 'Armor Plating',
    input: { hexDust: 10, cryoShards: 3 },
    output: { maxIntegrity: 20 },
    time: 4000
  },
  chargeCapacitor: {
    name: 'Charge Capacitor',
    input: { voltCoil: 5, luminGrain: 8 },
    output: { maxCharge: 25 },
    time: 3500
  }
};

// Aiming/build tile highlight
let aimIndicator = null;

// Initialize combat system
function initCombat(scene, player) {
  // Clear any existing enemies if intro is still running OR if they're in cities
  const enemiesToRemove = [];
  combatState.enemies.forEach(enemy => {
    let shouldRemove = false;
    
    // Remove if intro is running
    if (window.__introRunning) {
      shouldRemove = true;
    }
    
    // Also remove if enemy is in any city
    if (!shouldRemove && enemy.mesh && window.CITIES) {
      const pos = enemy.mesh.position;
      const inCity = window.CITIES.some(city => {
        const dx = pos.x - city.x;
        const dz = pos.z - city.z;
        const distanceToCity = Math.sqrt(dx * dx + dz * dz);
        return distanceToCity < (city.radius || 100) + 50;
      });
      
      if (inCity) {
        shouldRemove = true;
        debugLog('COMBAT', `Removing existing enemy in city at (${pos.x.toFixed(0)}, ${pos.z.toFixed(0)})`);
      }
    }
    
    if (shouldRemove) {
      if (enemy.mesh) {
        scene.remove(enemy.mesh);
        if (enemy.mesh.userData && enemy.mesh.userData.nameTag) {
          scene.remove(enemy.mesh.userData.nameTag);
        }
      }
      enemiesToRemove.push(enemy);
    }
  });
  
  // Remove flagged enemies
  enemiesToRemove.forEach(enemy => {
    const index = combatState.enemies.indexOf(enemy);
    if (index > -1) {
      combatState.enemies.splice(index, 1);
    }
  });
  
  if (enemiesToRemove.length > 0) {
    debugLog('COMBAT', `Cleared ${enemiesToRemove.length} enemies (intro or in cities)`);
  }
  
  // Start enemy spawning - REDUCED RATE from 5s to 10s
  if (window.__ftd_spawnTimer) clearInterval(window.__ftd_spawnTimer);
  window.__ftd_spawnTimer = setInterval(() => spawnEnemy(scene, player), 10000);

  // Periodic cleanup of enemies in cities (every 2 seconds)
  if (window.__ftd_cityCleanupTimer) clearInterval(window.__ftd_cityCleanupTimer);
  window.__ftd_cityCleanupTimer = setInterval(() => {
    const toRemove = [];
    combatState.enemies.forEach(enemy => {
      if (enemy.mesh && enemy.alive && window.CITIES) {
        const pos = enemy.mesh.position;
        const inCity = window.CITIES.some(city => {
          const dx = pos.x - city.x;
          const dz = pos.z - city.z;
          const distanceToCity = Math.sqrt(dx * dx + dz * dz);
          return distanceToCity < (city.radius || 100);
        });
        
        if (inCity) {
          toRemove.push(enemy);
          debugLog('ENEMY', `Removing enemy that entered city at (${pos.x.toFixed(0)}, ${pos.z.toFixed(0)})`);
        }
      }
    });
    
    // Remove enemies that are in cities
    toRemove.forEach(enemy => {
      enemy.alive = false;
      if (enemy.mesh) {
        scene.remove(enemy.mesh);
        if (enemy.mesh.userData && enemy.mesh.userData.nameTag) {
          scene.remove(enemy.mesh.userData.nameTag);
        }
      }
      const index = combatState.enemies.indexOf(enemy);
      if (index > -1) {
        combatState.enemies.splice(index, 1);
      }
    });
  }, 2000);

  // Start terrain debug ticker
  setInterval(terrainDebugTick, 1000);

  // Populate combat API without overwriting pre-exposed constants (e.g., BUILDINGS)
  window.combatSystem = Object.assign(window.combatSystem || {}, {
    takeDamage: takeDamage,
    combatState: combatState,
    fireWeapon: fireWeapon,
    updateCombat: updateCombat,
    spawnEnemy: spawnEnemy,
    damageEnemy: damageEnemy,
    placeBuilding: placeBuilding,
    craftItem: craftItem,
    updateSelectedBuilding: updateSelectedBuilding,
    toggleCraftMenu: toggleCraftMenu,
    toggleAutoFire: toggleAutoFire,
    regenerateResources: regenerateResources,
    showPermadeathScreen: showPermadeathScreen,
    showGuestGameOver: showGuestGameOver
  });
  
  // Initialize resource fields (harvestable tile patches)
  try { if (window.resourceSystem && window.resourceSystem.initFields) { window.resourceSystem.initFields(); } } catch(_) {}

  
  // Initialize HUD
  createCombatHUD();
  
  // Create square tile inner-border indicator centered on selected tile
  try {
    const tile = (window.tileSize || 2);
    const inset = tile * 0.10; // inner border inset
    const half = tile / 2 - inset;
    const thick = tile * 0.06; // medium thickness
    const shape = new THREE.Shape();
    shape.moveTo(-half, -half);
    shape.lineTo(half, -half);
    shape.lineTo(half, half);
    shape.lineTo(-half, half);
    shape.lineTo(-half, -half);
    const hole = new THREE.Path();
    hole.moveTo(-(half - thick), -(half - thick));
    hole.lineTo((half - thick), -(half - thick));
    hole.lineTo((half - thick), (half - thick));
    hole.lineTo(-(half - thick), (half - thick));
    hole.lineTo(-(half - thick), -(half - thick));
    shape.holes.push(hole);
    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    aimIndicator = new THREE.Mesh(geo, mat);
    aimIndicator.rotation.x = -Math.PI / 2;
    aimIndicator.renderOrder = 10000;
    scene.add(aimIndicator);
  } catch (e) {}
  
  // Set initial resources for testing
  combatState.playerStats.resources.hexDust = 50;
  combatState.playerStats.resources.luminGrain = 30;
  combatState.playerStats.resources.synthFibers = 20;
  
  updateCombatHUD();
}

// Create combat HUD elements
function createCombatHUD() {
  const hud = document.getElementById('hud');
  if (!hud) return;
  
  // Add weapon display - bottom left above integrity bar
  const weaponDisplay = document.createElement('div');
  weaponDisplay.id = 'weaponDisplay';
  weaponDisplay.style.cssText = `
    position: absolute;
    bottom: 80px;
    left: 10px;
    color: #ff00ff;
    font-family: monospace;
    font-size: 12px;
    text-shadow: 0 0 5px #ff00ff;
    background: rgba(0,0,0,0.5);
    padding: 5px;
    border-radius: 5px;
    z-index: 1000;
  `;
  hud.appendChild(weaponDisplay);
  
  // Add mobile combat controls
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Fire button - right side
    const fireButton = document.createElement('button');
    fireButton.id = 'fireButton';
    fireButton.innerHTML = 'FIRE';
    fireButton.style.cssText = `
      position: absolute;
      bottom: 200px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: rgba(255, 0, 0, 0.3);
      border: 2px solid #ff0000;
      border-radius: 50%;
      color: white;
      font-size: 24px;
      z-index: 1100;
      touch-action: none;
    `;
    fireButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (window.combatSystem) {
        window.combatSystem.fireWeapon(window.scene, window.player, window.facingDirection || 0);
      }
    });
    hud.appendChild(fireButton);
    
    // Switch weapon button
    const switchButton = document.createElement('button');
    switchButton.id = 'switchWeaponButton';
    switchButton.innerHTML = 'SWAP';
    switchButton.style.cssText = `
      position: absolute;
      bottom: 270px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: rgba(255, 255, 0, 0.3);
      border: 2px solid #ffff00;
      border-radius: 50%;
      color: white;
      font-size: 20px;
      z-index: 1100;
      touch-action: none;
    `;
    switchButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (window.combatSystem) {
        const weapons = Object.keys(window.combatSystem.WEAPONS);
        const currentWeapon = window.combatSystem.combatState.playerStats.equipment.weapon;
        const currentIndex = weapons.indexOf(currentWeapon);
        const nextIndex = (currentIndex + 1) % weapons.length;
        window.combatSystem.combatState.playerStats.equipment.weapon = weapons[nextIndex];
        window.combatSystem.updateCombatHUD();
      }
    });
    hud.appendChild(switchButton);
    
    // Build mode button
    const buildButton = document.createElement('button');
    buildButton.id = 'buildModeButton';
    buildButton.innerHTML = 'BUILD';
    buildButton.style.cssText = `
      position: absolute;
      bottom: 330px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: rgba(0, 255, 0, 0.3);
      border: 2px solid #00ff00;
      border-radius: 50%;
      color: white;
      font-size: 20px;
      z-index: 1100;
      touch-action: none;
    `;
    buildButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      // Mobile build button opens blueprint menu
      if (window.menuSystem) {
        window.menuSystem.toggle();
        window.menuSystem.switchTab('blueprints');
      }
    });
    hud.appendChild(buildButton);
    
    // Heal button
    const healButton = document.createElement('button');
    healButton.id = 'healButton';
    healButton.innerHTML = 'HEAL';
    healButton.style.cssText = `
      position: absolute;
      bottom: 200px;
      right: 90px;
      width: 50px;
      height: 50px;
      background: rgba(0, 255, 255, 0.3);
      border: 2px solid #00ffff;
      border-radius: 50%;
      color: white;
      font-size: 20px;
      z-index: 1100;
      touch-action: none;
    `;
    healButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (window.combatSystem) {
        window.combatSystem.craftItem('healingPack');
      }
    });
    hud.appendChild(healButton);
  }
  
  // Initialize selected building from blueprint on startup
  if (window.combatSystem && window.combatSystem.updateSelectedBuilding) {
    window.combatSystem.updateSelectedBuilding();
  }
  
  // Add craft menu - mobile optimized
  const craftMenu = document.createElement('div');
  craftMenu.id = 'craftMenu';
  craftMenu.style.cssText = `
    position: absolute;
    ${isMobile ? 'top: 120px; right: 10px;' : 'top: 100px; right: 10px;'}
    color: #ffaa00;
    font-family: monospace;
    font-size: ${isMobile ? '10px' : '12px'};
    text-shadow: 0 0 3px #ffaa00;
    text-align: right;
    display: none;
    background: rgba(0,0,0,0.7);
    padding: 10px;
    border-radius: 5px;
    z-index: 1200;
    max-width: ${isMobile ? '150px' : '250px'};
  `;
  craftMenu.innerHTML = `
    <div style="margin-bottom: 5px; font-weight: bold;">CRAFT MENU</div>
    <div class="craft-item" data-recipe="upgradeEnergy">Energy Weapon</div>
    <div class="craft-item" data-recipe="upgradePlasma">Plasma Cannon</div>
    <div class="craft-item" data-recipe="upgradeVoid">Void Rifle</div>
    <div class="craft-item" data-recipe="healingPack">Healing Pack</div>
    <div class="craft-item" data-recipe="chargeCell">Charge Cell</div>
    <div class="craft-item" data-recipe="armorPlating">Armor+</div>
    <div class="craft-item" data-recipe="chargeCapacitor">Charge+</div>
  `;
  hud.appendChild(craftMenu);
  
  // Add touch events for craft menu items on mobile
  if (isMobile) {
    setTimeout(() => {
      const craftItems = document.querySelectorAll('.craft-item');
      craftItems.forEach(item => {
        item.style.cssText = `
          padding: 8px;
          margin: 5px 0;
          background: rgba(255,170,0,0.1);
          border: 1px solid #ffaa00;
          border-radius: 3px;
        `;
        item.addEventListener('touchstart', (e) => {
          e.preventDefault();
          const recipe = item.getAttribute('data-recipe');
          if (window.combatSystem && recipe) {
            window.combatSystem.craftItem(recipe);
          }
        });
      });
    }, 100);
  }
  
  // Add craft button for mobile
  if (isMobile) {
    const craftButton = document.createElement('button');
    craftButton.id = 'craftMenuButton';
    craftButton.innerHTML = 'CRAFT';
    craftButton.style.cssText = `
      position: absolute;
      bottom: 390px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: rgba(255, 170, 0, 0.3);
      border: 2px solid #ffaa00;
      border-radius: 50%;
      color: white;
      font-size: 20px;
      z-index: 1100;
      touch-action: none;
    `;
    craftButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (window.combatSystem) {
        window.combatSystem.toggleCraftMenu();
      }
    });
    hud.appendChild(craftButton);
  }
}

// Update combat HUD - optimized for mobile
function updateCombatHUD() {
  const stats = combatState.playerStats;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Update integrity and charge bars
  const integrityBar = document.getElementById('integrityBar');
  const chargeBar = document.getElementById('chargeBar');
  
  if (integrityBar) {
    const integrityPercent = (stats.integrity / stats.maxIntegrity) * 100;
    integrityBar.style.width = `${integrityPercent}%`;
    integrityBar.style.backgroundColor = '#00ff00';
  }
  
  if (chargeBar) {
    const chargePercent = (stats.charge / stats.maxCharge) * 100;
    chargeBar.style.width = `${chargePercent}%`;
    // fixed yellow color
    chargeBar.style.backgroundColor = '#ffff00';
  }
  
  // Weapon display removed per user request
}

// Spawn enemy function
function spawnEnemy(scene, player) {
  // Don't spawn enemies during intro cinematic
  if (window.__introRunning) {
    debugLog('ENEMY', 'Skipping enemy spawn - intro is running');
    return;
  }
  
  if (!scene || !player || combatState.enemies.length >= 20) return;

  // Aggregate all known player positions (local + remote) to spawn near
  const allPlayers = [];
  try {
    if (player && player.position) allPlayers.push(player.position.clone());
    if (window.otherPlayers && typeof window.otherPlayers.forEach === 'function') {
      window.otherPlayers.forEach((op) => { if (op && op.mesh && op.mesh.position) allPlayers.push(op.mesh.position.clone()); });
    }
  } catch (_) {}
  if (allPlayers.length === 0) return;

  // Choose a random anchor player and cap enemies around them to avoid server load
  const anchor = allPlayers[Math.floor(Math.random() * allPlayers.length)];
  
  // Check if anchor player is in a city - if so, don't spawn enemies at all
  if (window.CITIES) {
    const playerInCity = window.CITIES.some(city => {
      const dx = anchor.x - city.x;
      const dz = anchor.z - city.z;
      const distanceToCity = Math.sqrt(dx * dx + dz * dz);
      return distanceToCity < (city.radius || 100);
    });
    
    if (playerInCity) {
      debugLog('ENEMY', 'Skipping enemy spawn - player is in a city');
      return;
    }
  }
  
  const nearbyCount = combatState.enemies.filter(e => e.alive && e.mesh.position.distanceTo(anchor) < 35).length;
  if (nearbyCount >= 6) return;

  // Try multiple spawn attempts to avoid cities
  let spawnX, spawnZ, attempts = 0;
  const maxAttempts = 10;
  
  do {
    // Difficulty-based enemy selection by region and player score
  // Spawn around anchor
  const angle = Math.random() * Math.PI * 2;
  const distance = 18 + Math.random() * 18;
    spawnX = anchor.x + Math.sin(angle) * distance;
    spawnZ = anchor.z + Math.cos(angle) * distance;
    
    // Check if spawn point is too close to any city or is on a city tile
    let tooCloseToCity = false;
    
    // First check distance to city centers with larger buffer
    if (window.CITIES) {
      tooCloseToCity = window.CITIES.some(city => {
        const dx = spawnX - city.x;
        const dz = spawnZ - city.z;
        const distanceToCity = Math.sqrt(dx * dx + dz * dz);
        // Use larger buffer: city radius + 100 units to be absolutely sure
        const safeDistance = (city.radius || 100) + 100;
        if (distanceToCity < safeDistance) {
          debugLog('ENEMY', `Spawn blocked: Too close to city ${city.name} (${distanceToCity.toFixed(1)} < ${safeDistance})`);
          return true;
        }
        return false;
      });
    }
    
    // Also check if this grid position is marked as a city tile
    if (!tooCloseToCity && window.CITY_TILE_KEYS && typeof cartesianToGrid === 'function') {
      const grid = cartesianToGrid(spawnX, spawnZ, window.tileSize || 2);
      tooCloseToCity = window.CITY_TILE_KEYS.has(`${grid.x},${grid.y}`);
      if (tooCloseToCity) {
        debugLog('ENEMY', `Spawn blocked: Grid (${grid.x}, ${grid.y}) is a city tile`);
      }
    }
    
    // Triple-check: is spawn position on elevated city terrain?
    if (!tooCloseToCity && typeof getCityHeight === 'function' && typeof cartesianToGrid === 'function') {
      const grid = cartesianToGrid(spawnX, spawnZ, window.tileSize || 2);
      const cityHeight = getCityHeight(grid.x, grid.y);
      if (cityHeight !== null && cityHeight > 5) {
        tooCloseToCity = true;
        debugLog('ENEMY', `Spawn blocked: Position is on elevated city terrain (height: ${cityHeight})`);
      }
    }
    
    if (!tooCloseToCity) break;
    attempts++;
  } while (attempts < maxAttempts);
  
  // If we couldn't find a good spawn point after max attempts, don't spawn
  if (attempts >= maxAttempts) return;
  
  const difficulty = getDifficultyAt(spawnX, spawnZ);
  const enemyType = pickEnemyTypeForDifficulty(difficulty, combatState.playerStats.score);
  const enemyData = ENEMY_TYPES[enemyType];
  // Assign level and scale stats
  const lvl = computeEnemyLevelAtPosition(spawnX, spawnZ, combatState.playerStats.score);

  // Compute terrain height for proper Y placement
  let spawnY = 1;
  try {
    if (typeof cartesianToGrid === 'function' && typeof tileSize !== 'undefined') {
      const grid = cartesianToGrid(spawnX, spawnZ, tileSize);
      
      // First check city override height
      let h = null;
      if (typeof getCityHeight === 'function') {
        h = getCityHeight(grid.x, grid.y);
      }
      
      // If no city override, use terrain height
      if (h === null || !Number.isFinite(h)) {
        if (typeof getHeight === 'function') {
          h = getHeight(grid.x, grid.y);
        }
      }
      
      spawnY = Number.isFinite(h) ? h + 0.6 : 1; // slight extra to ensure above tile top
      
      // Debug log spawn position
      debugLog('ENEMY', `Spawning ${enemyType} at grid (${grid.x}, ${grid.y}), height: ${h}, spawnY: ${spawnY}`);
    }
  } catch (e) {
    debugLog('ENEMY', 'Error computing spawn height:', e);
  }

  // Create enemy mesh based on modelType
  let geometry;
  let group; // Declare group variable for complex models
  switch(enemyData.modelType) {
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(enemyData.size, enemyData.size * 1.2, 2, 8);
      break;
    case 'box':
      geometry = new THREE.BoxGeometry(enemyData.size * 2, enemyData.size * 2, enemyData.size * 2);
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(enemyData.size, 8, 8);
      break;
    case 'octahedron':
      geometry = new THREE.OctahedronGeometry(enemyData.size);
      break;
    case 'tetrahedron':
      geometry = new THREE.TetrahedronGeometry(enemyData.size * 1.5);
      break;
    case 'small_cone':
      geometry = new THREE.ConeGeometry(enemyData.size * 0.8, enemyData.size * 1.5, 6);
      break;
    case 'complex':
      // Create a complex multi-part geometry for boss
      const group = new THREE.Group();
      const bodyGeo = new THREE.BoxGeometry(enemyData.size * 2, enemyData.size * 1.5, enemyData.size * 2);
      const armGeo = new THREE.CylinderGeometry(enemyData.size * 0.3, enemyData.size * 0.3, enemyData.size * 2, 6);
  const material = new THREE.MeshPhongMaterial({ color: enemyData.color, emissive: enemyData.color, emissiveIntensity: 0.3 });
      const body = new THREE.Mesh(bodyGeo, material);
      const armL = new THREE.Mesh(armGeo, material);
      const armR = new THREE.Mesh(armGeo, material);
      armL.position.x = -enemyData.size * 1.5;
      armR.position.x = enemyData.size * 1.5;
      armL.rotation.z = Math.PI / 2;
      armR.rotation.z = Math.PI / 2;
      group.add(body);
      group.add(armL);
      group.add(armR);
      group.position.set(spawnX, spawnY, spawnZ);
      scene.add(group);
      geometry = null; // We'll handle this specially
      break;
    case 'sprite':
      // Handled separately with textures
      geometry = new THREE.ConeGeometry(enemyData.size, enemyData.size * 2, 8);
      break;
    case 'cone':
    default:
      geometry = new THREE.ConeGeometry(enemyData.size, enemyData.size * 2, 8);
      break;
  }

  let enemyMesh;
  if (enemyData.modelType === 'complex') {
    enemyMesh = group; // Use the group created above
  } else {
    const material = new THREE.MeshPhongMaterial({ color: enemyData.color, emissive: enemyData.color, emissiveIntensity: 0.3 });
    enemyMesh = new THREE.Mesh(geometry, material);
  enemyMesh.position.set(spawnX, spawnY, spawnZ);
  scene.add(enemyMesh);
  }

  // Enemy object with lightweight AI state for natural behavior
  const enemy = {
    type: enemyType,
    data: enemyData,
    mesh: enemyMesh,
    position: enemyMesh.position,
    level: lvl,
    currentIntegrity: Math.round(enemyData.integrity * (1 + 0.15 * (lvl - 1))),
    lastAttack: 0,
    alive: true,
    state: 'wander',
    wanderTarget: null,
    nextThinkAt: Date.now(),
    lastSeenPlayerAt: 0,
    home: enemyMesh.position.clone(),
    spinPhase: 0,
    spinning: false,
    // For special behaviors
    stealthTimer: 0,
    isStealthed: false,
    specialAttackTimer: 0
  };
  // Use the enemy type's name
  enemyMesh.userData.enemyName = enemyData.name;
  debugLog('ENEMY', `Set enemy name: ${enemyData.name} for type: ${enemyType}`);
  try {
    const playerLevel = (window.menuSystem && window.menuSystem.playerData && window.menuSystem.playerData.level) ? window.menuSystem.playerData.level : 1;
    const color = levelColorFor(lvl - playerLevel);
    const tag = makeEnemyNameTag(enemyMesh.userData.enemyName || 'Enemy', lvl, color);
    if (tag) { tag.position.set(spawnX, spawnY + 2.5, spawnZ); scene.add(tag); enemyMesh.userData.nameTag = tag; }
  } catch(_){ }

  const spriteMat = new THREE.SpriteMaterial({ map: getScriptTexture(enemyType), color: enemyData.color, transparent: true });
  function getScriptTexture(type) {
    try {
      const loader = new THREE.TextureLoader();
      if (type === 'script') return loader.load('/assets/scrip.png');
      if (type === 'script_phantom') return loader.load('/assets/scrip_phantom.png');
    } catch(_) {}
    return null;
  }
  if (enemyType === 'script' || enemyType === 'script_phantom') {
    // billboarded sprite facing camera yaw; orient top forward
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.2, 1.2, 1.2);
    sprite.position.set(spawnX, spawnY + 1.5, spawnZ);
    enemyMesh.visible = false; // hide cone/cylinder base for flyers
    scene.add(sprite);
    enemyMesh.userData.sprite = sprite;
  }
  
  // Networking: owner spawns
  try {
    if (window.socket && window.socket.emit && (!window.__netEnemies || !window.__netEnemies.has(enemy.id))) {
      const eid = `e_${Date.now()}_${Math.floor(Math.random()*100000)}`;
      enemy.id = eid;
      window.socket.emit('enemySpawn', { id: eid, type: enemyType, x: enemyMesh.position.x, y: enemyMesh.position.y, z: enemyMesh.position.z, meta: { t: Date.now(), level: lvl, name: enemyMesh.userData.enemyName||'Enemy' } });
    }
  } catch(_) {}
  
  combatState.enemies.push(enemy);
}

// Floating text helper
function showFloatingText(worldPos, text, color = '#00ff00', durationMs = 800) {
  try {
    if (!window.renderer || !window.camera) return;
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;pointer-events:none;font:14px monospace;text-shadow:0 0 6px currentColor;z-index:1800;';
    div.style.color = color;
    div.textContent = text;
    document.body.appendChild(div);
    const start = performance.now();
    const startWorld = worldPos.clone();
    function step() {
      const t = (performance.now() - start) / durationMs;
      if (t >= 1) { try { document.body.removeChild(div); } catch(_){} return; }
      const pos = startWorld.clone();
      pos.y += t * 0.8; // float up
      const proj = pos.project(window.camera);
      const x = (proj.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-proj.y * 0.5 + 0.5) * window.innerHeight;
      div.style.left = `${Math.round(x)}px`; div.style.top = `${Math.round(y)}px`;
      div.style.opacity = String(1 - t);
      requestAnimationFrame(step);
    }
    step();
  } catch (_) {}
}

function computeTerrainHeightAt(x, z) {
  try {
    if (typeof window.sampleGroundHeightAt === 'function') {
      const h = window.sampleGroundHeightAt(x, z);
      if (Number.isFinite(h)) return h;
    }
    if (typeof cartesianToGrid === 'function' && typeof tileSize !== 'undefined') {
      const grid = cartesianToGrid(x, z, tileSize);
      let h = null;
      try { if (typeof getCityHeight === 'function') h = getCityHeight(grid.x, grid.y); } catch(_) {}
      if (!Number.isFinite(h)) { try { h = getHeight(grid.x, grid.y); } catch(_) {} }
      return Number.isFinite(h) ? h : 0;
    }
  } catch(_) {}
  return 0;
}

function hasLineOfSight(from, to) {
  try {
    // Check city building colliders first
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len <= 0.001) return true;
    const dirN = dir.clone().normalize();
    if (Array.isArray(window.cityColliders) && window.cityColliders.length) {
      const ray = new THREE.Ray(from.clone(), dirN);
      for (const c of window.cityColliders) {
        if (!c || !c.box) continue;
        const hit = ray.intersectBox(c.box, new THREE.Vector3());
        if (hit) {
          const dist = hit.distanceTo(from);
          if (dist > 0.05 && dist < len - 0.05) {
            return { blocked: true, point: hit.clone() };
          }
        }
      }
    }
    // Check player-built buildings (approximate with current bounding boxes)
    try {
      if (Array.isArray(combatState.buildings) && combatState.buildings.length) {
        const ray = new THREE.Ray(from.clone(), dirN);
        for (const b of combatState.buildings) {
          if (!b || !b.mesh) continue;
          const box = new THREE.Box3().setFromObject(b.mesh);
          const hit = ray.intersectBox(box, new THREE.Vector3());
          if (hit) {
            const dist = hit.distanceTo(from);
            if (dist > 0.05 && dist < len - 0.05) {
              return { blocked: true, point: hit.clone() };
            }
          }
        }
      }
    } catch(_) {}
    // Sample along ray against tile tower sides via height steps
    const steps = Math.max(8, Math.min(64, Math.ceil(len)));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const p = new THREE.Vector3().lerpVectors(from, to, t);
      const th = computeTerrainHeightAt(p.x, p.z);
      if (p.y < th + 0.6) {
        // Hit a tile tower side; compute surface point
        return { blocked: true, point: new THREE.Vector3(p.x, th + 0.6, p.z) };
      }
    }
  } catch(_) {}
  return { blocked: false };
}

function computeHitChance(weapon, playerPos, enemy) {
  // Base player accuracy chosen so that player * starter weapon ≈ 50% at 5u
  const playerAcc = 0.625;
  const weaponAcc = Math.max(0, Math.min(1, (weapon && typeof weapon.accuracy === 'number') ? weapon.accuracy : 0.8));
  const dist = enemy.mesh.position.distanceTo(playerPos);
  const nearRef = 5;
  const falloff = Math.max(5, (weapon && weapon.range) ? (weapon.range - nearRef) : 25);
  const distanceFactor = dist <= nearRef ? 1 : Math.max(0.1, 1 - (dist - nearRef) / falloff);
  // High ground bonus: +10% per stack (approx per 1.0 unit height), up to +30%
  const dh = (playerPos.y - enemy.mesh.position.y);
  const highGroundBonus = Math.max(0, Math.min(0.3, 0.1 * Math.round(dh)));
  // Movement penalty if player moving significantly
  let movePenalty = 0;
  try {
    const mvx = (window.movementDirection && window.movementDirection.x) ? window.movementDirection.x : 0;
    const mvz = (window.movementDirection && window.movementDirection.z) ? window.movementDirection.z : 0;
    const moving = Math.hypot(mvx, mvz) > 0.4;
    movePenalty = moving ? 0.2 : 0;
  } catch(_) {}
  const base = playerAcc * weaponAcc * distanceFactor * (1 + highGroundBonus);
  const final = Math.max(0, Math.min(0.95, base * (1 - movePenalty)));
  return final;
}

function pickFallbackEnemy(player) {
  let best = null; let bestDist = Infinity;
  combatState.enemies.forEach(e => {
    if (!e.alive) return;
    const d = e.mesh.position.distanceTo(player.position);
    if (d < bestDist) { bestDist = d; best = e; }
  });
  return best;
}

function showMissAt(point) {
  if (!point) return;
  showFloatingText(point, 'MISS', '#ff0000', 900);
}

function showDamageAt(enemy, amount) {
  const base = enemy.mesh.position.clone();
  const offset = new THREE.Vector3((Math.random()-0.5)*0.6, 0.8 + Math.random()*0.3, (Math.random()-0.5)*0.6);
  showFloatingText(base.add(offset), String(amount), '#00ff00', 900);
}

// Main combat update loop
function updateCombat(deltaTime, scene, player, camera) {
  if (!scene || !player) return;
  if (window.__ftd_dead) return;
  
  // Update build tile highlight (follows player position to nearest grid tile)
  try {
    if (aimIndicator) {
      const tile = (window.tileSize || 2);
      const grid = window.cartesianToGrid(player.position.x, player.position.z, tile);
      const world = window.gridToCartesian(grid.x, grid.y, tile);
      let y = 0;
      try {
        const g = window.cartesianToGrid(world.x, world.z, tile);
        let h = null; try { h = window.getCityHeight(g.x, g.y); } catch(_){ }
        if (!Number.isFinite(h)) { try { h = window.getHeight(g.x, g.y); } catch(_){}
        }
        y = Number.isFinite(h) ? h : 0;
      } catch(_){ y = 0; }
      aimIndicator.position.set(world.x, y + 0.02, world.z);
    }
  } catch(_){ }
  
  // Auto-fire handling (continuous fire governed by weapon cooldown)
  if (combatState.autoFire) {
    const weaponKey = combatState.playerStats.equipment.weapon;
    const weapon = WEAPONS[weaponKey];
    const now = Date.now();
    if (weapon && now - combatState.playerStats.weaponCooldown >= weapon.cooldown) {
      const dir = (window.facingDirection !== undefined) ? window.facingDirection : 0;
      fireWeapon(scene, player, dir);
    }
  }

  // Press-and-hold B to build selected blueprint in front if resources available
  if (window.keys && window.keys['KeyB']) {
    if (!combatState.__buildingProgress) combatState.__buildingProgress = 0;
    combatState.__buildingProgress += deltaTime;
    const requiredTime = 1500; // ms build time
    if (typeof window.showBuildGauge === 'function') window.showBuildGauge();
    if (typeof window.updateBuildGauge === 'function') window.updateBuildGauge(combatState.__buildingProgress, requiredTime);
    if (combatState.__buildingProgress >= requiredTime) {
      const type = combatState.playerStats.selectedBuilding;
      if (type && BUILDINGS[type]) {
        const placed = placeBuilding(type, scene, player, (window.facingDirection||0));
        if (placed) {
          combatState.__buildingProgress = 0;
          if (typeof window.updateBuildGauge === 'function') window.updateBuildGauge(0, requiredTime);
        }
      }
    }
  } else {
    combatState.__buildingProgress = 0;
    if (typeof window.updateBuildGauge === 'function') window.updateBuildGauge(0, 1);
  }
  
  // Ensure tile highlight tint reflects firing state
  try {
    if (aimIndicator && aimIndicator.material) {
      const desired = combatState.autoFire ? 0xff4444 : 0xffffff;
      if (aimIndicator.material.color && aimIndicator.material.color.getHex() !== desired) {
        aimIndicator.material.color.set(desired);
      }
    }
  } catch(_) {}
  
  // Update enemies
  combatState.enemies = combatState.enemies.filter(enemy => {
    enemy._speedMultTemp = 1;
    if (!enemy.alive) {
      scene.remove(enemy.mesh);
      // Also remove name tag
      if (enemy.mesh && enemy.mesh.userData && enemy.mesh.userData.nameTag) {
        scene.remove(enemy.mesh.userData.nameTag);
      }
      return false;
    }

    // Compute nearest player and distance
    let nearestPlayerPos = player.position;
    let nearestDistance = enemy.position.distanceTo(player.position);
    try {
      if (window.otherPlayers && typeof window.otherPlayers.forEach === 'function') {
        window.otherPlayers.forEach(op => {
          if (!op || !op.mesh) return;
          const d = enemy.position.distanceTo(op.mesh.position);
          if (d < nearestDistance) { nearestDistance = d; nearestPlayerPos = op.mesh.position; }
        });
      }
    } catch (_) {}

    const now = Date.now();
    const insideSafe = !!window.__ftd_inTent; // player-safe dampener
    const visionRange = Math.max(20, (enemy.data.attackRange || 2) + 18);

    // Update simple state machine
    if (nearestDistance < visionRange && !insideSafe) {
      enemy.state = 'pursue';
      enemy.lastSeenPlayerAt = now;
    } else if (now - enemy.lastSeenPlayerAt > 5000) {
      enemy.state = 'wander';
    }

    // Throttle AI updates when far from any player
    const far = nearestDistance > 60;
    if (now < enemy.nextThinkAt) {
      // Cheap Y correction even when idling
      try {
        const h = computeTerrainHeightAt(enemy.position.x, enemy.position.z);
        if (Number.isFinite(h)) enemy.position.y = h + (window.CHARACTER_Y_OFFSET || 0.6);
      }
      catch (_) {}
      return true;
    }
    enemy.nextThinkAt = now + (far ? 300 : 60);

    // Movement behavior (slope-aware like player)
    const SLOPE_MAX_ASCENT = 1.01;
    function tryMove(dx, dz) {
      const newX = enemy.position.x + dx;
      const newZ = enemy.position.z + dz;
      
      // Check if new position would be in a city - if so, don't move
      if (window.CITIES) {
        const wouldBeInCity = window.CITIES.some(city => {
          const distX = newX - city.x;
          const distZ = newZ - city.z;
          const distanceToCity = Math.sqrt(distX * distX + distZ * distZ);
          return distanceToCity < (city.radius || 100);
        });
        
        if (wouldBeInCity) {
          // Try to move away from the city instead
          const nearestCity = window.CITIES.reduce((nearest, city) => {
            const dist = Math.sqrt((newX - city.x) ** 2 + (newZ - city.z) ** 2);
            if (!nearest || dist < nearest.dist) {
              return { city, dist };
            }
            return nearest;
          }, null);
          
          if (nearestCity) {
            // Move away from city center
            const awayX = enemy.position.x - nearestCity.city.x;
            const awayZ = enemy.position.z - nearestCity.city.z;
            const awayDist = Math.sqrt(awayX * awayX + awayZ * awayZ);
            if (awayDist > 0.1) {
              enemy.position.x += (awayX / awayDist) * Math.abs(dx);
              enemy.position.z += (awayZ / awayDist) * Math.abs(dz);
            }
          }
          return false; // Don't allow the original move
        }
      }
      
      const curH = computeTerrainHeightAt(enemy.position.x, enemy.position.z);
      const tgtH = computeTerrainHeightAt(newX, newZ);
      const heightDiff = (Number.isFinite(tgtH) && Number.isFinite(curH)) ? (tgtH - curH) : 0;
      if ((heightDiff <= 0) || (heightDiff <= SLOPE_MAX_ASCENT)) {
        enemy.position.x = newX; enemy.position.z = newZ; return true;
      }
      // Slide along an axis
      const testX = enemy.position.x + dx;
      const testZ = enemy.position.z + dz;
      const tXh = computeTerrainHeightAt(testX, enemy.position.z);
      const tZh = computeTerrainHeightAt(enemy.position.x, testZ);
      const canX = Number.isFinite(tXh) && Number.isFinite(curH) && ((tXh - curH <= 0) || (tXh - curH <= SLOPE_MAX_ASCENT));
      const canZ = Number.isFinite(tZh) && Number.isFinite(curH) && ((tZh - curH <= 0) || (tZh - curH <= SLOPE_MAX_ASCENT));
      if (canX && !canZ) { enemy.position.x += dx * 0.75; return true; }
      if (canZ && !canX) { enemy.position.z += dz * 0.75; return true; }
      return false;
    }
    if (enemy.data.speed > 0) {
      if (enemy.state === 'pursue') {
        const direction = new THREE.Vector3().subVectors(nearestPlayerPos, enemy.position).normalize();
          const step = (enemy.data.speed * (1 + 0.01 * ((enemy.level||1)-1))) * (enemy._speedMultTemp||1) * (deltaTime * 0.06);
        const dx = direction.x * step; const dz = direction.z * step;
        tryMove(dx, dz);
        enemy.mesh.lookAt(new THREE.Vector3(nearestPlayerPos.x, enemy.mesh.position.y, nearestPlayerPos.z));
      } else {
        // Wander: pick a local target and meander
        if (!enemy.wanderTarget || enemy.position.distanceTo(enemy.wanderTarget) < 1.0) {
          const a = Math.random() * Math.PI * 2;
          const r = 6 + Math.random() * 10;
          enemy.wanderTarget = new THREE.Vector3(
            enemy.position.x + Math.cos(a) * r,
            enemy.position.y,
            enemy.position.z + Math.sin(a) * r
          );
        }
        const dir = new THREE.Vector3().subVectors(enemy.wanderTarget, enemy.position).normalize();
        const step = (enemy.data.speed * 0.6) * (deltaTime * 0.06);
        const dx = dir.x * step; const dz = dir.z * step;
        tryMove(dx, dz);
        enemy.mesh.lookAt(new THREE.Vector3(enemy.wanderTarget.x, enemy.mesh.position.y, enemy.wanderTarget.z));
      }
    }

    // Terrain-follow Y update
    try {
      if (enemy.type !== 'glider') {
        const gh = computeTerrainHeightAt(enemy.position.x, enemy.position.z);
        if (Number.isFinite(gh)) enemy.position.y = gh + (window.CHARACTER_Y_OFFSET || 0.6);
      }
    } catch (_) {}

      // Attack if in range (skip when in tent safe) 
    const distToLocal = enemy.position.distanceTo(player.position);
    if (!insideSafe && distToLocal < enemy.data.attackRange && (now - enemy.lastAttack) > enemy.data.attackCooldown) {
      enemy.lastAttack = now;
      const dmgLvl = Math.floor((enemy.data.damage||10) * (1 + 0.07 * ((enemy.level||1)-1)));
      takeDamage({ amount: dmgLvl, type: enemy.data.damageType || 'kinetic' });
    }

    // Despawn if far from all players for a while (MMO-friendly)
    const anyPlayerNear = nearestDistance < 80;
    enemy.__farSince = anyPlayerNear ? 0 : (enemy.__farSince ? enemy.__farSince : now);
    if (!anyPlayerNear && enemy.__farSince && (now - enemy.__farSince) > 15000) {
      enemy.alive = false;
      scene.remove(enemy.mesh);
      // Also remove name tag
      if (enemy.mesh && enemy.mesh.userData && enemy.mesh.userData.nameTag) {
        scene.remove(enemy.mesh.userData.nameTag);
      }
      return false;
    }

    // Virtchud attack behavior: approach, spin-flatten burst, then recover
    const now2 = Date.now();
    const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position);
    const distToPlayer = toPlayer.length();
    if (distToPlayer < Math.max(2.0, enemy.data.attackRange + 0.5) && (now2 - enemy.lastAttack) > enemy.data.attackCooldown) {
      enemy.lastAttack = now2;
      enemy.spinning = true;
      enemy.spinPhase = 0;
    }
    if (enemy.spinning) {
      // Spin up: scale Y down, spin around Y, do contact damage if close but don't overlap
      enemy.spinPhase += deltaTime * 0.0025; // ~400ms to complete
      const t = Math.min(1, enemy.spinPhase);
      try {
        enemy.mesh.rotation.y += 0.6 * (deltaTime * 0.016);
        const scaleY = THREE.MathUtils.lerp(1, 0.4, t);
        const scaleXZ = THREE.MathUtils.lerp(1, 1.2, t);
        enemy.mesh.scale.set(scaleXZ, scaleY, scaleXZ);
        // Push back to avoid overlapping player
        const pushDir = toPlayer.clone().normalize();
        if (distToPlayer < 1.2) {
          player.position.add(pushDir.clone().multiplyScalar(0.05));
          enemy.position.add(pushDir.clone().multiplyScalar(-0.05));
        }
        if (distToPlayer < enemy.data.attackRange + 0.3 && t > 0.3 && t < 0.9) {
          takeDamage(enemy.data.damage);
        }
        if (t >= 1) {
          // Recover over ~400ms
          enemy.spinning = false;
          enemy.__recoverUntil = now2 + 400;
        }
      } catch(_) {}
    } else if (enemy.__recoverUntil && now2 < enemy.__recoverUntil) {
      const k = (enemy.__recoverUntil - now2) / 400;
      const scaleY = THREE.MathUtils.lerp(1, 0.4, k);
      const scaleXZ = THREE.MathUtils.lerp(1, 1.2, k);
      enemy.mesh.scale.set(scaleXZ, scaleY, scaleXZ);
    } else {
      // Ensure normal scale
      enemy.mesh.scale.set(1,1,1);
    }

    // Prevent overlapping player in general
    if (distToPlayer < 1.0) {
      const sep = toPlayer.clone().normalize().multiplyScalar(0.04);
      enemy.position.add(sep.clone().multiplyScalar(-1));
      player.position.add(sep);
    }

    // Special motion: Script and Phantom Script follow arcs and swoops near ground; phantom follows nearest script
    if (enemy.type === 'script' || enemy.type === 'script_phantom') {
      try {
        const t = performance.now() * 0.001 + (enemy.__phase || 0);
        const __bh = computeTerrainHeightAt(enemy.position.x, enemy.position.z);
        const baseH = Number.isFinite(__bh) ? __bh : enemy.position.y;
        // arc/swoop: sine wave within 2-4 units of ground
        const targetY = baseH + 2 + Math.sin(t * 1.5) * 1.0;
        enemy.position.y = THREE.MathUtils.lerp(enemy.position.y, targetY, 0.2);
        if (enemy.type === 'script_phantom') {
          // follow nearest script
          let target = null; let best = Infinity;
          combatState.enemies.forEach(e => { if (e.alive && e.type==='script') { const d = e.position.distanceTo(enemy.position); if (d<best) { best=d; target=e; } } });
          if (target) {
            const dir = new THREE.Vector3().subVectors(target.position, enemy.position).normalize();
            enemy.position.add(dir.multiplyScalar(enemy.data.speed * (deltaTime * 0.06)));
          }
        } else {
          // meander forward with slight curve
          const angle = (enemy.__angle || (Math.random()*Math.PI*2)) + Math.sin(t*0.5)*0.03;
          enemy.__angle = angle;
          enemy.position.x += Math.cos(angle) * enemy.data.speed * (deltaTime * 0.06);
          enemy.position.z += Math.sin(angle) * enemy.data.speed * (deltaTime * 0.06);
        }
        // Sync movement over network (owner-only)
        try { if (window.socket && window.socket.emit && enemy.id) { window.socket.emit('enemyMove', { id: enemy.id, x: enemy.position.x, y: enemy.position.y, z: enemy.position.z }); } } catch(_) {}
      } catch(_) {}
    }

    // Update name tag position
    try {
      const tag = enemy.mesh && enemy.mesh.userData && enemy.mesh.userData.nameTag;
      if (tag) { tag.position.set(enemy.position.x, enemy.position.y + 2.5, enemy.position.z); }
    } catch(_){}

    return true;
  });
  
  // Update projectiles
  combatState.projectiles = combatState.projectiles.filter(projectile => {
    if (!projectile.alive) {
      scene.remove(projectile.mesh);
      return false;
    }
    // Move projectile (visual only)
    projectile.position.add(projectile.velocity.clone().multiplyScalar(deltaTime * 0.06));
    projectile.distanceTraveled += projectile.velocity.length() * deltaTime * 0.06;
    if (projectile.distanceTraveled > projectile.maxRange) {
      projectile.alive = false;
      return true;
    }
    return true;
  });
  
  // Update buildings
  combatState.buildings.forEach(building => {
      const now = Date.now();
    // Passive effects by type
    try {
      const bp = building.data || {};
      const pos = building.mesh.position;
      if (building.alive) {
        // Healing Totem
        if (bp.healRadius && bp.healPerSec && window.player) {
          const d = pos.distanceTo(window.player.position);
          if (d <= bp.healRadius) {
            combatState.playerStats.integrity = Math.min(combatState.playerStats.maxIntegrity,
              combatState.playerStats.integrity + bp.healPerSec * (deltaTime*0.001));
          }
        }
        // Slow Field
        if (bp.slowRadius && bp.slowFactor) {
          combatState.enemies.forEach(e=>{
            const d = pos.distanceTo(e.position); if (d<=bp.slowRadius) { e._speedMultTemp = Math.min(e._speedMultTemp||1, bp.slowFactor); }
          });
        }
        // Spike Trap
        if (bp.trapRadius && bp.trapDps) {
          combatState.enemies.forEach(e=>{
            const d = pos.distanceTo(e.position); if (d<=bp.trapRadius) { damageEnemy(e, bp.trapDps * (deltaTime*0.001), window.scene); }
          });
        }
        // Resource Harvester -> boost resources regrow speed
        if (bp.harvestBoostRadius && bp.boost && window.resourceSystem) {
          window.__harvestBoost = { center: pos.clone(), r: bp.harvestBoostRadius, mult: bp.boost, t: now+200 };
        }
        // Drone Charger – set global fireRate scale for drones near
        if (bp.chargeRadius && bp.fireRateScale && window.droneSystem) {
          window.droneSystem.drones && window.droneSystem.drones.forEach(d=>{
            const dd = pos.distanceTo(d.mesh.position); if (dd<=bp.chargeRadius) { d._rateScaleUntil = now+300; d._rateScale = bp.fireRateScale; }
          });
        }
        // Radar Beacon – simple ping
        if (bp.pingRadius) {
          building._nextPing = building._nextPing || (now + 3000);
          if (now >= building._nextPing) {
            building._nextPing = now + 3000;
            let ne=null, nd=bp.pingRadius; combatState.enemies.forEach(e=>{ const de=pos.distanceTo(e.position); if (de<nd){ nd=de; ne=e; } });
            if (ne) {
              try { ne.mesh.material.emissive = new THREE.Color(0xffff00); setTimeout(()=>{ if (ne && ne.mesh && ne.mesh.material) ne.mesh.material.emissive = new THREE.Color(ne.data.color); }, 400); } catch(_){}
            }
          }
        }
        // Speed Pad – player boost
        if (bp.speedRadius && bp.speedMult && window.player) {
          const d = pos.distanceTo(window.player.position); if (d<=bp.speedRadius) { window.__speedBoost = Math.max(window.__speedBoost||1, bp.speedMult); setTimeout(()=>{ window.__speedBoost = 1; }, 100); }
        }
      }
    } catch(_){}

    // Turret-like logic for any building with range/damage/fireRate
    if (building.alive && building.data && building.data.range && building.data.damage && building.data.fireRate) {
      // slow passive charge regen
      building.charge = Math.min(building.maxCharge||20, (building.charge||0) + 0.5 * (deltaTime * 0.001));
      // Aim
      let nearestEnemy = null; let nearestDistance = Infinity;
      combatState.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        const distance = building.mesh.position.distanceTo(enemy.position);
        if (distance < building.data.range && distance < nearestDistance) { nearestDistance = distance; nearestEnemy = enemy; }
      });
      if (nearestEnemy) {
        const look = nearestEnemy.position.clone(); look.y = building.mesh.position.y; building.mesh.lookAt(look);
      }
      if (nearestEnemy && now - (building.lastFire||0) > building.data.fireRate && (building.charge||0) >= 1) {
        building.lastFire = now;
        building.charge = (building.charge||0) - 1; // per shot
        fireTurretProjectile(building, nearestEnemy, scene);
        // Immediate hit resolution; projectile is visual
        const dmg = Number(building.data.damage)||0;
        damageEnemy(nearestEnemy, dmg, scene);
        if (building.data.slowOnHit) {
          const factor = Math.max(0.1, Math.min(1, building.data.slowOnHit));
          nearestEnemy._hitSlowUntil = now + 1200;
          nearestEnemy._hitSlowFactor = Math.min(nearestEnemy._hitSlowFactor||1, factor);
        }
      }
    }
  });
  
  // Edge-detect F key (press events only)
  const __fPressed = !!(window.keys && window.keys['KeyF']);
  const __fJustPressed = __fPressed && !window.__ftd_prevF;
  window.__ftd_prevF = __fPressed;
  const wasInTent = !!window.__ftd_inTent;

  // Tent enter/exit detection and prompt
  try {
    const nearTent = combatState.buildings.find(b => b.type === 'tent' && b.alive && b.mesh.position.distanceTo(player.position) < (b.data.safeRadius||8));
    let prompt = document.getElementById('tentPrompt');

    // Prompt visibility when outside tent but near one
    if (nearTent && !wasInTent) {
      if (!prompt) {
        prompt = document.createElement('div');
        prompt.id = 'tentPrompt';
        prompt.style.cssText = 'position:absolute;bottom:100px;left:50%;transform:translateX(-50%);color:#00ffff;font:14px monospace;background:rgba(0,0,0,0.6);padding:6px 10px;border:1px solid #00ffff;z-index:1500';
        prompt.textContent = 'Press F to enter tent (safe zone)';
        document.body.appendChild(prompt);
      }
    } else if (prompt) {
      prompt.remove();
    }

    // Enter tent: only when not already in tent, near a tent, and F was just pressed
    if (!wasInTent && nearTent && __fJustPressed) {
      window.__ftd_inTent = true;
      if (prompt) { try { prompt.remove(); } catch (_) {} }
      let overlay = document.getElementById('tentOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'tentOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,10,10,0.6);z-index:1400;pointer-events:none;';
        document.body.appendChild(overlay);
      }
      // Move player to tent center and hide visually
      try {
        const tpos = nearTent.mesh.position.clone();
        if (window.player) {
          window.player.position.set(tpos.x, tpos.y, tpos.z);
          window.player.visible = false;
        }
        // Snap camera to tent center focus
        if (window.camera && typeof window.cameraOffset !== 'undefined') {
          const camPos = tpos.clone().add(window.cameraOffset);
          window.camera.position.copy(camPos);
          const look = new THREE.Vector3(
            window.camera.position.x - Math.sin(window.cameraRotation) * window.cameraDistance,
            tpos.y,
            window.camera.position.z - Math.cos(window.cameraRotation) * window.cameraDistance
          );
          window.camera.lookAt(look);
        }
      } catch (_) {}
    }

    // Exit tent: only when previously in tent and either moving or F was just pressed
    if (wasInTent && window.__ftd_inTent) {
      const mvx = (window.movementDirection && window.movementDirection.x) ? window.movementDirection.x : 0;
      const mvz = (window.movementDirection && window.movementDirection.z) ? window.movementDirection.z : 0;
      const moving = Math.hypot(mvx, mvz) > 0.05;
      if (moving || __fJustPressed) {
        window.__ftd_inTent = false;
        const overlay = document.getElementById('tentOverlay');
        overlay && overlay.remove();
        // Re-enable player visibility and allow camera follow to resume naturally
        try { if (window.player) window.player.visible = true; } catch (_) {}
      }
    }
  } catch (_) {}

  // Passive regeneration
  // Slow health regen if not recently damaged
  const inTent = !!window.__ftd_inTent;
  const regenRate = (inTent ? 1.0 : 0.5); // integrity per second (doubled in tent)
  if (combatState.playerStats.integrity < combatState.playerStats.maxIntegrity) {
    combatState.playerStats.integrity = Math.min(
      combatState.playerStats.maxIntegrity,
      combatState.playerStats.integrity + regenRate * deltaTime * 0.001
    );
  }

  // Charge dynamics: sprint cost only + slow regen
  const moveVX = (window.movementDirection && window.movementDirection.x) ? window.movementDirection.x : 0;
  const moveVZ = (window.movementDirection && window.movementDirection.z) ? window.movementDirection.z : 0;
  const moveSpeedNorm = Math.min(1, Math.hypot(moveVX, moveVZ));
  const isMoving = moveSpeedNorm > 0.01;
  const isSprinting = window.isSprinting && isMoving; // Only count as sprinting if actually moving
  const sprintChargeDrainPerSec = 4.0; // Sprint drain rate (was the old movement drain rate)
  const passiveChargeRegenPerSec = (inTent ? 1.6 : 0.8); // doubled in tent
  
  // Only drain charge when sprinting, not for normal movement
  if (isSprinting) {
    combatState.playerStats.charge -= sprintChargeDrainPerSec * moveSpeedNorm * (deltaTime * 0.001);
  }
  combatState.playerStats.charge += passiveChargeRegenPerSec * (deltaTime * 0.001);
  combatState.playerStats.charge = Math.max(0, Math.min(combatState.playerStats.charge, combatState.playerStats.maxCharge));
  
  // Movement slow when charge critically low (<10%) and prevent sprinting
  try {
    const low = combatState.playerStats.charge < (combatState.playerStats.maxCharge * 0.10);
    if (low) {
      // Prevent sprinting when charge is too low
      window.isSprinting = false;
      // reduce current frame movement by half by nudging player slightly back toward previous position
      if (window.player && typeof window.lastPlayerPos === 'object') {
        player.position.lerp(window.lastPlayerPos, 0.5);
      }
    }
    // cache last position each frame for smoothing
    window.lastPlayerPos = (window.lastPlayerPos || player.position.clone());
    window.lastPlayerPos.copy(player.position);
  } catch(_) {}
  
  updateCombatHUD();

  // Building behaviors (turrets, conduits, shields, synthesizers)
  try {
    const now = Date.now();
    if (!combatState.__buildingLogicInit) {
      combatState.__buildingLogicInit = true;
      combatState.buildings.forEach(b => { b.lastTick = now; b.lastProcess = now; b.lastFire = b.lastFire || 0; });
    }
    // Reconcile world-synced meshes with local behavior list (ensure positions updated)
    if (Array.isArray(window.__buildingMeshes) && window.__buildingMeshes.length) {
      // No hard overwrite of local list; behaviors use local combatState.buildings
    }
    const enemies = combatState.enemies.filter(e=>e.alive);
    combatState.buildings = combatState.buildings.filter(b => !!(b && b.mesh && b.mesh.parent));
    for (const b of combatState.buildings) {
      const type = b.type;
      // Maintain Y lock to terrain to avoid floating if ground moves
      try {
        const gh = computeTerrainHeightAt(b.mesh.position.x, b.mesh.position.z);
        if (Number.isFinite(gh)) {
          const desiredY = gh + (b.data && b.data.height ? (b.data.height/2) : 1);
          b.mesh.position.y = THREE.MathUtils.lerp(b.mesh.position.y, desiredY, 0.2);
        }
      } catch(_) {}
      // Turret firing
      if (type === 'turret') {
        const fireRate = b.data.fireRate || 1000;
        if (now - (b.lastFire||0) >= fireRate) {
          let best = null; let bestDist = Infinity;
          for (const e of enemies) {
            const d = e.mesh.position.distanceTo(b.mesh.position);
            if (d < (b.data.range || 20) && d < bestDist) { best = e; bestDist = d; }
          }
          if (best) {
            b.lastFire = now;
            // Fire simple projectile towards target
            const dir = new THREE.Vector3().subVectors(best.mesh.position, b.mesh.position).normalize();
            const muzzle = b.mesh.position.clone().add(dir.clone().multiplyScalar(1.0));
            spawnProjectile(scene, muzzle, dir, b.data.damage || 10, 2.0, 0xFF4444);
          }
        }
      }
      // Charge Conduit regen for player within radius
      if (type === 'chargeConduit') {
        const regenR = b.data.regenRadius || 15;
        const regenRate = b.data.regenRate || 2;
        const dist = b.mesh.position.distanceTo(player.position);
        if (dist < regenR) {
          combatState.playerStats.charge = Math.min(
            combatState.playerStats.maxCharge,
            combatState.playerStats.charge + (regenRate * (deltaTime/1000))
          );
        }
      }
      // Shield generator: simple damage dampener flag for entities within radius
      if (type === 'shield') {
        const R = b.data.shieldRadius || 10;
        // Cache a flag; damage code can read it (if integrated). For now, minor passive heal as placeholder.
        const dist = b.mesh.position.distanceTo(player.position);
        if (dist < R) {
          combatState.playerStats.integrity = Math.min(
            combatState.playerStats.maxIntegrity,
            combatState.playerStats.integrity + 0.5 * (deltaTime/1000)
          );
        }
      }
      // Synthesizer: periodic resource tick
      if (type === 'synthesizer') {
        const interval = b.data.processRate || 5000;
        if (now - (b.lastProcess||0) >= interval) {
          b.lastProcess = now;
          // Add basic outputs
          combatState.playerStats.resources = combatState.playerStats.resources || {};
          combatState.playerStats.resources.hexDust = (combatState.playerStats.resources.hexDust||0) + 1;
          combatState.playerStats.resources.luminGrain = (combatState.playerStats.resources.luminGrain||0) + 1;
          updateCombatHUD();
        }
      }
    }
  } catch(_) {}

  try {
    if (window.selectedEnemy && window.selectedEnemy.alive && window.selectedRing) {
      const p = window.selectedEnemy.mesh.position;
      window.selectedRing.position.set(p.x, p.y + 0.02, p.z);
    } else if (window.selectedEnemy && !window.selectedEnemy.alive) {
      setSelectedEnemy(null);
      try { if (window.combatSystem && window.combatSystem.combatState) window.combatSystem.combatState.autoFire = false; } catch(_){}
    }
  } catch(_) {}
}

// Fire weapon
function fireWeapon(scene, player, facingDirection) {
  // Temporarily flash tile border red while firing
  try { if (aimIndicator && aimIndicator.material) aimIndicator.material.color.set(0xff4444); } catch(_){ }
  const weaponKey = combatState.playerStats.equipment.weapon;
  const weapon = WEAPONS[weaponKey];
  const now = Date.now();
  
  if (!weapon) {
    if (window.menuSystem && window.menuSystem.showNotification) {
      window.menuSystem.showNotification('No primary weapon equipped');
    }
    return;
  }
  if (now - combatState.playerStats.weaponCooldown < weapon.cooldown) return;
  
  // Base shot cost with slight run bias removed (no run toggle anymore)
  const baseShotCost = 2;
  const costFactor = (window.menuSystem && window.menuSystem.__weaponCostFactor) ? window.menuSystem.__weaponCostFactor : 1.0;
  const chargeCost = Math.max(0, Math.floor((((typeof weapon.chargeUse === 'number' ? weapon.chargeUse : 0) + baseShotCost) * costFactor)));
  if (combatState.playerStats.charge < chargeCost) {
    return;
  }
  combatState.playerStats.charge -= chargeCost;
  combatState.playerStats.weaponCooldown = now;
  
  // Determine target: selected enemy if any, else nearest in range
  let targetEnemy = (window.selectedEnemy && window.selectedEnemy.alive) ? window.selectedEnemy : null;
  if (!targetEnemy) {
    targetEnemy = pickFallbackEnemy(player);
  }
  
  // Spawn visual projectile from player toward either target or facing
  const projectileGeometry = weapon.projectileType === 'explosive' ? new THREE.SphereGeometry(0.3, 6, 6) : new THREE.BoxGeometry(0.2, 0.2, 0.6);
  try { projectileGeometry.computeBoundingSphere(); } catch(_) {}
  const projectileMaterial = new THREE.MeshBasicMaterial({ color: weapon.color });
  const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
  const spawnOffset = 0.7;
  const spawn = new THREE.Vector3(
    player.position.x + Math.sin(facingDirection) * spawnOffset,
    player.position.y + 0.5,
    player.position.z + Math.cos(facingDirection) * spawnOffset
  );
  projectileMesh.position.copy(spawn);
  scene.add(projectileMesh);
  
  // If we have a target, aim directly and resolve hit via accuracy + LOS
  if (targetEnemy && targetEnemy.alive) {
    const toTargetDir = new THREE.Vector3().subVectors(targetEnemy.mesh.position.clone().add(new THREE.Vector3(0, 0.4, 0)), spawn).normalize();
    const speedBonus = (window.menuSystem && window.menuSystem.__projectileSpeedBonus) ? (1 + window.menuSystem.__projectileSpeedBonus) : 1.0;
    const projVel = toTargetDir.clone().multiplyScalar((weapon.projectileSpeed||2.0) * speedBonus);
    const projectile = { mesh: projectileMesh, position: projectileMesh.position, velocity: projVel, damage: weapon.damage, owner: 'player', distanceTraveled: 0, maxRange: weapon.range, alive: true };
    combatState.projectiles.push(projectile);

    // LOS check
    const los = hasLineOfSight(spawn, targetEnemy.mesh.position.clone().add(new THREE.Vector3(0,0.4,0)));
    if (los.blocked) {
      try { projectile.position.copy(los.point); } catch(_) {}
      showMissAt(los.point);
    } else {
      let chance = computeHitChance(weapon, player.position, targetEnemy);
      const accuracyBonus = (window.menuSystem && window.menuSystem.__weaponAccuracyBonus) ? window.menuSystem.__weaponAccuracyBonus : 0;
      chance = Math.min(0.99, chance + accuracyBonus);
      const roll = Math.random();
      if (roll <= chance) {
        const pm = (window.menuSystem && window.menuSystem.playerData && window.menuSystem.playerData.perkMods) ? window.menuSystem.playerData.perkMods : null;
        const dmgMult = pm ? (pm.attackMultiplier||1.0) : 1.0;
        const finalDmg = Math.floor((weapon.damage||10) * dmgMult);
        damageEnemy(targetEnemy, finalDmg, scene);
        showDamageAt(targetEnemy, finalDmg);
        if (!targetEnemy.alive) {
          try { if (typeof window.setSelectedEnemy === 'function') window.setSelectedEnemy(null); } catch(_) {}
          try { if (window.selectedEnemy && !window.selectedEnemy.alive) window.selectedEnemy = null; } catch(_) {}
        }
      } else {
        const head = targetEnemy.mesh.position.clone().add(new THREE.Vector3((Math.random()-0.5)*0.4, 0.9 + Math.random()*0.3, (Math.random()-0.5)*0.4));
        showFloatingText(head, '0', '#ff0000', 900);
      }
    }
  } else {
    // No valid target: shoot forward visually, no hit calc
    const baseDirection = new THREE.Vector3(Math.sin(facingDirection), 0, Math.cos(facingDirection));
    const speedBonus = (window.menuSystem && window.menuSystem.__projectileSpeedBonus) ? (1 + window.menuSystem.__projectileSpeedBonus) : 1.0;
    const projectile = { mesh: projectileMesh, position: projectileMesh.position, velocity: baseDirection.multiplyScalar((weapon.projectileSpeed||2.0) * speedBonus), damage: weapon.damage, owner: 'player', distanceTraveled: 0, maxRange: weapon.range, alive: true };
    combatState.projectiles.push(projectile);
  }
  
  // Muzzle flash
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.5, 4, 4), new THREE.MeshBasicMaterial({ color: weapon.color, transparent: true, opacity: 0.8 }));
  flash.position.copy(player.position); flash.position.y += 0.5; scene.add(flash);
  setTimeout(() => { try { scene.remove(flash); } catch(_){} }, 100);
  
  updateCombatHUD();
}

// Fire turret projectile
function fireTurretProjectile(turret, target, scene) {
  const direction = new THREE.Vector3()
    .subVectors(target.position, turret.mesh.position)
    .normalize();
  
  const projectileGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.3);
  const projectileMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4444
  });
  
  const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
  projectileMesh.position.copy(turret.mesh.position);
  projectileMesh.position.y += 1;
  scene.add(projectileMesh);
  
  const projectile = {
    mesh: projectileMesh,
    position: projectileMesh.position,
    velocity: direction.multiplyScalar(0.8),
    damage: turret.data.damage,
    owner: 'turret',
    distanceTraveled: 0,
    maxRange: turret.data.range,
    alive: true
  };
  
  combatState.projectiles.push(projectile);
}

// Damage enemy
function damageEnemy(enemy, damage, scene) {
  enemy.currentIntegrity -= damage;
  
  // Flash effect
  enemy.mesh.material.emissive = new THREE.Color(0xffffff);
  setTimeout(() => {
    if (enemy.mesh && enemy.mesh.material) {
      enemy.mesh.material.emissive = new THREE.Color(enemy.data.color);
    }
  }, 100);
  
  if (enemy.currentIntegrity <= 0) {
    enemy.alive = false;
    
    // Drop resources
    Object.entries(enemy.data.drops).forEach(([resource, amount]) => {
      combatState.playerStats.resources[resource] = 
        (combatState.playerStats.resources[resource] || 0) + amount;
    });
    
    // Add score
    combatState.playerStats.score += enemy.data.score;
    combatState.playerStats.kills++;
    
    // Give XP for defeating enemy
    if (window.menuSystem && window.menuSystem.addExperience) {
      const xpReward = enemy.data.score / 10; // 10% of score as XP
      window.menuSystem.addExperience(xpReward);
    }
    
    // Death effect
    const deathEffect = new THREE.Mesh(
      new THREE.SphereGeometry(2, 8, 8),
      new THREE.MeshBasicMaterial({
        color: enemy.data.color,
        transparent: true,
        opacity: 0.5,
        wireframe: true
      })
    );
    deathEffect.position.copy(enemy.position);
    scene.add(deathEffect);
    
    // Simple death animation
    let scale = 1;
    const deathInterval = setInterval(() => {
      scale += 0.3;
      deathEffect.scale.set(scale, scale, scale);
      deathEffect.material.opacity -= 0.05;
      if (deathEffect.material.opacity <= 0) {
        clearInterval(deathInterval);
        scene.remove(deathEffect);
      }
    }, 50);
    
    // If Script dies, drop a corpse pickup at ground level
    try {
      if (enemy.type === 'script') {
        const g = (typeof cartesianToGrid === 'function') ? cartesianToGrid(enemy.position.x, enemy.position.z, tileSize) : { x:0,y:0 };
        let h = null; try { if (typeof getCityHeight === 'function') h = getCityHeight(g.x, g.y); } catch(_){}
        if (!Number.isFinite(h) && typeof getHeight === 'function') { try { h = getHeight(g.x, g.y); } catch(_){} }
        const th = computeTerrainHeightAt(enemy.position.x, enemy.position.z);
        const y = Number.isFinite(th) ? th + 0.2 : enemy.position.y;
        const corpse = document.createElement('div');
        corpse.className = 'pickup corpse';
        corpse.style.cssText = 'position:absolute;pointer-events:none;color:#ccc;font:12px monospace;';
        document.body.appendChild(corpse);
        // Optional: implement proper 3D pickup later
      }
    } catch(_) {}
    // Network death
    try { if (window.socket && window.socket.emit && enemy.id) window.socket.emit('enemyDie', { id: enemy.id }); } catch(_) {}
    // Cleanup name tag
    try { const tag = enemy.mesh && enemy.mesh.userData && enemy.mesh.userData.nameTag; if (tag && tag.parent) tag.parent.remove(tag); } catch(_){}
  }
}

// Take damage (player)
function takeDamage(amount) {
  let dmg = 0; let dtype = 'kinetic';
  if (typeof amount === 'number') { dmg = amount; }
  else if (amount && typeof amount === 'object') { dmg = Number(amount.amount)||0; dtype = String(amount.type||'kinetic'); }
  else { dmg = 0; }
  try {
    const resists = window.__equippedArmorResists || {};
    const resist = Math.max(0, Math.min(0.9, Number(resists[dtype])||0));
    dmg = Math.max(0, dmg * (1 - resist));
  } catch(_){}
  combatState.playerStats.integrity -= dmg;
  // Cancel pending unsafe logout on damage
  try { if (window.cancelLogoutCountdown) window.cancelLogoutCountdown('damage'); } catch(_){}
  
  // Visual feedback
  if (window.player) {
    try {
      if (window.player.material && 'emissive' in window.player.material) {
        window.player.material.emissive = new THREE.Color(0xff0000);
        setTimeout(() => {
          if (window.player && window.player.material && 'emissive' in window.player.material) {
            window.player.material.emissive = new THREE.Color(0x0088ff);
          }
        }, 200);
      }
    } catch (_) {}
  }
  
  updateCombatHUD();
  
  if (combatState.playerStats.integrity <= 0) {
    const isGuest = window.menuSystem && window.menuSystem.playerData && window.menuSystem.playerData.isGuest;
    window.__ftd_dead = true;
    if (isGuest) {
      showGuestGameOver();
    } else {
      debugLog('COMBAT', 'PERMADEATH: Character deleted for registered account');
      showPermadeathScreen();
      setTimeout(() => {
        try {
          if (window.menuSystem) {
            localStorage.removeItem('playerData');
            window.menuSystem.playerData = null;
          }
        } catch (_) {}
        window.location.href = '/';
      }, 5000);
    }
  }
}

// Show permadeath screen
function showPermadeathScreen() {
  // Add pulse animation CSS
  if (!document.getElementById('permadeath-styles')) {
    const style = document.createElement('style');
    style.id = 'permadeath-styles';
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 0.3; }
        50% { opacity: 1; }
        100% { opacity: 0.3; }
      }
    `;
    document.head.appendChild(style);
  }
  
  const deathScreen = document.createElement('div');
  deathScreen.id = 'permadeathScreen';
  deathScreen.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 20000;
    color: #ff0000;
    font-family: 'Courier New', monospace;
    text-align: center;
  `;
  
  deathScreen.innerHTML = `
    <h1 style="font-size: 3em; margin-bottom: 20px; text-shadow: 0 0 20px #ff0000;">PERMADEATH</h1>
    <p style="font-size: 1.5em; margin-bottom: 10px;">Your character has been permanently deleted.</p>
    <p style="font-size: 1.2em; margin-bottom: 20px;">Returning to main menu in 5 seconds...</p>
    <div style="font-size: 2em; animation: pulse 1s infinite;">💀</div>
  `;
  
  document.body.appendChild(deathScreen);
}

// Show guest game over screen with stats and respawn option
function showGuestGameOver() {
  try { if (window.socket) { window.socket.disconnect(); } } catch (_) {}
  try { if (window.combatSystem) { window.combatSystem.autoFire = false; } } catch (_) {}

  const stats = combatState.playerStats;
  const overlay = document.createElement('div');
  overlay.id = 'guestGameOver';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.85);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: #00ffff; font-family: monospace; z-index: 20000; text-align: center;`;

  const panel = document.createElement('div');
  panel.style.cssText = `background: rgba(0,0,0,0.5); padding: 20px 28px; border: 1px solid #00ffff; border-radius: 8px;`;
  panel.innerHTML = `
    <div style="font-size: 28px; margin-bottom: 10px; color:#ff5555; text-shadow:0 0 12px #ff0000;">YOU DIED</div>
    <div style="margin: 6px 0;">Kills: <b>${stats.kills}</b></div>
    <div style="margin: 6px 0;">Score: <b>${stats.score}</b></div>
    <div style="margin: 6px 0;">Resources: <b>${Object.values(stats.resources).reduce((a,b)=>a+(b||0),0)}</b></div>
    <button id="btnRespawn" style="margin-top: 16px; padding: 8px 14px; background:#00ffff; color:#000; border:none; border-radius:4px; cursor:pointer;">Respawn (R)</button>
  `;
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  function doRespawn(){
    // reset transient state
    combatState.projectiles.forEach(p => { try { if (p.mesh && p.mesh.parent) p.mesh.parent.remove(p.mesh); } catch (_) {} });
    combatState.projectiles.length = 0;
    combatState.enemies = combatState.enemies.filter(e => { try { if (e && e.mesh && e.mesh.parent) e.mesh.parent.remove(e.mesh); } catch (_) {} return false; });
    // clear city colliders (will be rebuilt)
    if (Array.isArray(window.cityColliders)) window.cityColliders.length = 0;

    combatState.playerStats.integrity = combatState.playerStats.maxIntegrity;
    combatState.playerStats.charge = combatState.playerStats.maxCharge;
    window.__ftd_dead = false;
    if (window.player) {
      window.player.position.set((Math.random()-0.5)*20, 5, (Math.random()-0.5)*20);
    }
    // refresh chunks to rebuild geometry safely
    try {
      const { q, r } = window.cartesianToAxial(window.player.position.x, window.player.position.z, window.tileSize);
      window.reloadVisibleChunks && window.reloadVisibleChunks();
    } catch (_) {}
    updateCombatHUD();
    overlay.remove();
  }

  panel.querySelector('#btnRespawn').addEventListener('click', doRespawn);
  window.addEventListener('keydown', function onKey(e){ if(e.code==='KeyR'){ doRespawn(); window.removeEventListener('keydown', onKey); } });
}

// Place building
function placeBuilding(buildingType, scene, player, facingDirection) {
  const buildingData = BUILDINGS[buildingType];
  if (!buildingData) return false;
  
  // Check resources
  let canAffordBuild = true;
  Object.entries(buildingData.cost||{}).forEach(([resource, amount]) => {
    if ((combatState.playerStats.resources[resource] || 0) < amount) {
      canAffordBuild = false;
    }
  });
  if (!canAffordBuild) return false;

  // Calculate placement position in front of player
  const placeDistance = 4;
  const position = new THREE.Vector3(
    player.position.x + Math.sin(facingDirection) * placeDistance,
    0,
    player.position.z + Math.cos(facingDirection) * placeDistance
  );

  // Terrain height at placement (city overrides first)
  let terrainY = 0;
  try {
    if (typeof cartesianToGrid === 'function' && typeof tileSize !== 'undefined') {
      const grid = cartesianToGrid(position.x, position.z, tileSize);
      let h = null;
      try { if (typeof getCityHeight === 'function') h = getCityHeight(grid.x, grid.y); } catch(_) {}
      if (!Number.isFinite(h) && typeof getHeight === 'function') { try { h = getHeight(grid.x, grid.y); } catch(_) {} }
      terrainY = Number.isFinite(h) ? h : 0;
    }
  } catch (_) {}

  // Deduct resources
  let canAffordAgain = true;
  Object.entries(buildingData.cost||{}).forEach(([resource, amount]) => {
    if ((combatState.playerStats.resources[resource] || 0) < amount) canAffordAgain = false;
  });
  if (!canAffordAgain) return false;
  Object.entries(buildingData.cost||{}).forEach(([resource, amount]) => { combatState.playerStats.resources[resource] -= amount; });

  if (buildingType === 'raiseTile') {
    // Persistent tile raise: send to server; locally reflect in CITY_TILE_OVERRIDES and world state
    try {
      const grid = cartesianToGrid(position.x, position.z, tileSize);
      const isCity = (window.CITY_TILE_KEYS && window.CITY_TILE_KEYS.has(`${grid.x},${grid.y}`));
      if (isCity) {
        if (window.menuSystem && window.menuSystem.showNotification) window.menuSystem.showNotification('Cannot raise city tiles');
        return false;
      }
      if (window.socket && window.socket.emit) window.socket.emit('raiseTile', { q: grid.x, r: grid.y, amount: 1 });
      // Local optimistic update
      const key = `${grid.x},${grid.y}`;
      const existing = (window.CITY_TILE_OVERRIDES.get(key) || { height: getHeight(grid.x, grid.y) });
      window.CITY_TILE_OVERRIDES.set(key, { height: (existing.height || 0) + 1 });
      window.reloadVisibleChunks && window.reloadVisibleChunks();
    } catch(_) {}
    updateCombatHUD();
    return true;
  }

  // Create building mesh
  let geometry;
  switch(buildingData.model) {
    case 'block':
      geometry = new THREE.BoxGeometry(2, buildingData.height, 2);
      break;
    case 'ramp':
      geometry = new THREE.BoxGeometry(2, buildingData.height, 4);
      break;
    case 'tent':
      // Broader tent footprint and a bit shorter for visibility
      geometry = new THREE.CylinderGeometry(0, 2.4, Math.max(1.8, buildingData.height * 0.7), 6, 1);
      break;
    case 'turret':
      geometry = new THREE.CylinderGeometry(0.8, 1, buildingData.height, 8);
      break;
    case 'synthesizer':
      geometry = new THREE.OctahedronGeometry(1, 0);
      break;
    case 'conduit':
      geometry = new THREE.ConeGeometry(0.6, buildingData.height, 6);
      break;
    case 'shield':
      geometry = new THREE.SphereGeometry(1, 8, 8);
      break;
    default:
      geometry = new THREE.BoxGeometry(2, buildingData.height, 2);
  }

  const material = new THREE.MeshPhongMaterial({
    color: buildingData.color,
    emissive: buildingData.color,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.8
  });

  const buildingMesh = new THREE.Mesh(geometry, material);
  buildingMesh.position.copy(position);
  buildingMesh.position.y = terrainY + (buildingData.height / 2) + 0.05;
  scene.add(buildingMesh);

  // Tent-specific metadata
  if (buildingType === 'tent') {
    const safeRadius = buildingData.safeRadius || 10;
    setInterval(() => {
      combatState.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        const d = enemy.position.distanceTo(buildingMesh.position);
        if (d < safeRadius && (enemy.type === 'crawler' || enemy.type === 'striker')) {
          const angle = Math.random() * Math.PI * 2;
          enemy.position.x += Math.cos(angle) * 0.5;
          enemy.position.z += Math.sin(angle) * 0.5;
        }
      });
    }, 1000);
    buildingMesh.userData.isTent = true;
    buildingMesh.userData.safeRadius = safeRadius;
  }

  const building = {
    type: buildingType,
    data: buildingData,
    mesh: buildingMesh,
    position: buildingMesh.position,
    currentIntegrity: buildingData.integrity,
    alive: true,
    lastFire: 0,
    charge: 20,
    maxCharge: 20
  };

  if (buildingType === 'turret') { building.autonomous = true; }

  combatState.buildings.push(building);
  updateCombatHUD();

  // Persist and broadcast building placement
  try {
    if (window.socket && window.socket.emit) {
      window.socket.emit('placeBuilding', {
        type: buildingType,
        x: buildingMesh.position.x,
        y: buildingMesh.position.y,
        z: buildingMesh.position.z,
        rotation: 0,
        integrity: building.currentIntegrity,
        maxIntegrity: building.data.integrity
      });
    }
  } catch(_) {}

  return true;
}

// Craft item
function craftItem(recipeName) {
  const recipe = RECIPES[recipeName];
  if (!recipe) return false;
  
  // Check resources
  let canCraft = true;
  Object.entries(recipe.input).forEach(([resource, amount]) => {
    if ((combatState.playerStats.resources[resource] || 0) < amount) {
      canCraft = false;
    }
  });
  
  if (!canCraft) {
    return false;
  }
  
  // Deduct resources
  Object.entries(recipe.input).forEach(([resource, amount]) => {
    combatState.playerStats.resources[resource] -= amount;
  });
  
  // Apply output after delay
  setTimeout(() => {
    Object.entries(recipe.output).forEach(([type, value]) => {
      if (type === 'weapon') {
        combatState.playerStats.equipment.weapon = value;
      } else if (type === 'healing') {
        combatState.playerStats.integrity = Math.min(
          combatState.playerStats.integrity + value,
          combatState.playerStats.maxIntegrity
        );
      } else if (type === 'charge') {
        combatState.playerStats.charge = Math.min(
          combatState.playerStats.charge + value,
          combatState.playerStats.maxCharge
        );
      } else if (type === 'maxIntegrity') {
        combatState.playerStats.maxIntegrity += value;
        combatState.playerStats.integrity += value;
      } else if (type === 'maxCharge') {
        combatState.playerStats.maxCharge += value;
        combatState.playerStats.charge += value;
      }
    });
    updateCombatHUD();
  }, recipe.time);
  
  return true;
}

// Set selected building from active blueprint if known
function updateSelectedBuilding() {
  try {
    const bp = (window.menuSystem && window.menuSystem.playerData && window.menuSystem.playerData.blueprints) || {};
    const active = (window.menuSystem && window.menuSystem.playerData && window.menuSystem.playerData.activeBlueprint) || null;
    if (active && bp[active] && BUILDINGS[active]) {
      combatState.playerStats.selectedBuilding = active;
    }
  } catch (_) {}
}

// Toggle craft menu
function toggleCraftMenu() {
  const craftMenu = document.getElementById('craftMenu');
  if (craftMenu) {
    const isVisible = craftMenu.style.display === 'block';
    craftMenu.style.display = isVisible ? 'none' : 'block';
  }
}

// Toggle auto fire
function toggleAutoFire() {
  const weaponKey = combatState.playerStats.equipment.weapon;
  if (!weaponKey || !WEAPONS[weaponKey]) {
    if (window.menuSystem && window.menuSystem.showNotification) {
      window.menuSystem.showNotification('No primary weapon equipped');
    }
    combatState.autoFire = false;
    return;
  }
  combatState.autoFire = !combatState.autoFire;
  try {
    if (aimIndicator && aimIndicator.material && aimIndicator.material.color) {
      aimIndicator.material.color.set(combatState.autoFire ? 0xff4444 : 0xffffff);
    }
  } catch (_) {}
}

// Regenerate resources
function regenerateResources() {
  combatState.playerStats.resources.hexDust += 2;
  combatState.playerStats.resources.luminGrain += 1;
  
  // Update menu inventory
  if (window.menuSystem) {
    window.menuSystem.addItem('hex_dust', 2);
    window.menuSystem.addItem('lumin_grain', 1);
  }
  
  updateCombatHUD();
}

// Update export with all functions
window.combatSystem = {
  initCombat,
  updateCombat,
  updateCombatHUD,
  fireWeapon,
  placeBuilding,
  craftItem,
  updateSelectedBuilding,
  toggleCraftMenu,
  toggleAutoFire,
  takeDamage,
  combatState,
  WEAPONS,
  BUILDINGS,
  ENEMY_TYPES,
  RECIPES
}; 

// Expose helpers (best-effort)
try { window.showFloatingText = showFloatingText; } catch(_) {}
try { window.computeHitChance = computeHitChance; } catch(_) {}
try { window.hasLineOfSight = hasLineOfSight; } catch(_) {} 

// Sync remote enemies (visual-only placeholders) from network state
(function setupEnemySync(){
  function syncNetworkEnemies(){
    try {
      if (!window.__netEnemies) return;
      const ids = new Set();
      window.__netEnemies.forEach((e)=>{ ids.add(e.id); });
      // Remove local ghost meshes that correspond to remote enemies no longer present
      combatState.enemies = combatState.enemies.filter(en => {
        if (en.id && en.owner === 'remote' && !ids.has(en.id)) {
          try { 
            if (en.mesh && en.mesh.parent) en.mesh.parent.remove(en.mesh);
            // Also remove name tag
            if (en.mesh && en.mesh.userData && en.mesh.userData.nameTag) {
              en.mesh.parent.remove(en.mesh.userData.nameTag);
            }
          } catch(_){}
          return false;
        }
        return true;
      });
      // Create/update visual ghosts for remote enemies
      window.__netEnemies.forEach((e)=>{
        if (!e || !e.id) return;
        
        // Check if this remote enemy is in a city - if so, don't create it
        const enemyX = e.x || 0;
        const enemyZ = e.z || 0;
        
        // Check all cities on this map
        if (window.CITIES) {
          const inCity = window.CITIES.some(city => {
            const dx = enemyX - city.x;
            const dz = enemyZ - city.z;
            const distanceToCity = Math.sqrt(dx * dx + dz * dz);
            return distanceToCity < (city.radius || 100) + 50; // Buffer zone
          });
          
          if (inCity) {
            debugLog('ENEMY', `Blocking remote enemy ${e.id} - spawned in city`);
            return; // Skip this enemy entirely
          }
        }
        
        let local = combatState.enemies.find(en => en.id === e.id);
        if (!local) {
          const data = ENEMY_TYPES[e.type] || ENEMY_TYPES.shill;
          const geometry = e.type === 'turret' ? new THREE.CylinderGeometry(data.size||1, (data.size||1)*1.2, 2, 8) : new THREE.ConeGeometry(data.size||1, (data.size||1)*2, 8);
          const material = new THREE.MeshPhongMaterial({ color: data.color||0xff00ff, emissive: data.color||0xff00ff, emissiveIntensity: 0.25 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(e.x||0, e.y||1, e.z||0);
          scene && scene.add(mesh);
          const lvl = (e.meta && Number.isFinite(e.meta.level)) ? e.meta.level : computeEnemyLevelAtPosition(mesh.position.x, mesh.position.z, (window.combatSystem && window.combatSystem.combatState && window.combatSystem.combatState.playerStats && window.combatSystem.combatState.playerStats.score)||0);
          // Name tag
          try {
            const playerLevel = (window.menuSystem && window.menuSystem.playerData && window.menuSystem.playerData.level) ? window.menuSystem.playerData.level : 1;
            const color = levelColorFor(lvl - playerLevel);
            const name = (e.meta && e.meta.name) ? e.meta.name : 'Enemy';
            const tag = makeEnemyNameTag(name, lvl, color);
            if (tag) { tag.position.set(mesh.position.x, mesh.position.y + 2.5, mesh.position.z); scene.add(tag); mesh.userData.nameTag = tag; }
          } catch(_){ }
          local = { id: e.id, type: e.type, data, mesh, position: mesh.position, currentIntegrity: data.integrity||40, level: lvl, alive: true, owner: 'remote' };
          combatState.enemies.push(local);
        } else {
          // Update position for existing remote enemy
          if (Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.z)) {
            local.mesh.position.set(e.x, e.y, e.z);
          }
        }
      });
    } catch(_){}
  }
  try { window.syncNetworkEnemies = syncNetworkEnemies; } catch(_){ }
})();

// Credits display removed per user request
window.__updateCreditsHUD = function(){}; // Keep empty function to avoid errors

// Client economy wiring
(function wireEconomy(){
  function applyEconomy({ credits, items }){
    try { if (typeof window.__updateCreditsHUD === 'function') window.__updateCreditsHUD(credits); } catch(_){}
    try { window.__economyItems = items || []; } catch(_){}
  }
  if (window.socket) {
    window.socket.on('economyState', applyEconomy);
    window.socket.on('purchaseResult', (res)=>{ if (!res.ok) { window.menuSystem && window.menuSystem.showNotification(res.error||'Purchase failed'); } else { window.menuSystem && window.menuSystem.showNotification('Purchased '+(res.item && res.item.name || 'item')); } });
    window.socket.emit('requestEconomy');
  } else {
    window.addEventListener('load', () => { try { window.socket && window.socket.emit('requestEconomy'); window.socket && window.socket.on('economyState', applyEconomy); } catch(_){} });
  }
})();

// City Shops UI – 3D signs above NPCs instead of UI button
(function setupCityShops(){ window.ARMOR_TEMPLATES && (void 0);
  const ARMOR_TEMPLATES = {
    armor_light: { name: 'Light Vest', resist: { kinetic: 0.15, heat: 0.05, plasma: 0.0, electric: 0.05, cryo: 0.0, void: 0.0 } },
    armor_medium: { name: 'Composite Plate', resist: { kinetic: 0.25, heat: 0.1, plasma: 0.05, electric: 0.05, cryo: 0.05, void: 0.0 } },
    armor_heavy: { name: 'Heavy Armor', resist: { kinetic: 0.4, heat: 0.15, plasma: 0.1, electric: 0.1, cryo: 0.1, void: 0.0 } },
    armor_thermal: { name: 'Thermal Suit', resist: { kinetic: 0.1, heat: 0.35, plasma: 0.1, electric: 0.05, cryo: 0.0, void: 0.0 } },
    armor_plasma: { name: 'Plasma Weave', resist: { kinetic: 0.1, heat: 0.1, plasma: 0.35, electric: 0.05, cryo: 0.05, void: 0.0 } },
    armor_shock: { name: 'Faraday Mesh', resist: { kinetic: 0.15, heat: 0.05, plasma: 0.05, electric: 0.4, cryo: 0.05, void: 0.0 } },
    armor_void: { name: 'Void Plating', resist: { kinetic: 0.2, heat: 0.1, plasma: 0.2, electric: 0.1, cryo: 0.1, void: 0.2 } }
  };
  const DRONES = {
    drone_mk1: { name: 'Helper Drone Mk I', capacity: 12, speed: 0.09, baseArmor: { kinetic: 0.1 }, baseWeapon: 'pulseSMG' },
    drone_mk2: { name: 'Helper Drone Mk II', capacity: 18, speed: 0.11, baseArmor: { kinetic: 0.15, electric: 0.1 }, baseWeapon: 'energyDischarger' }
  };

  // Create 3D shop sign
  function createShopSign() {
    try {
      // Create glowing holographic sign (no post, just floating)
      const group = new THREE.Group();
      
      // Create glowing frame
      const frameGeometry = new THREE.BoxGeometry(1.8, 0.9, 0.05);
      const frameMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff66ff, 
        emissive: 0xff66ff, 
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.8
      });
      const frame = new THREE.Mesh(frameGeometry, frameMaterial);
      frame.position.y = 2.5; // Float above NPC
      
      // Create text sprite with better styling
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 256;
      
      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, 512, 256);
      gradient.addColorStop(0, 'rgba(255,102,255,0.2)');
      gradient.addColorStop(0.5, 'rgba(0,255,255,0.1)');
      gradient.addColorStop(1, 'rgba(255,102,255,0.2)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 256);
      
      // Glowing border
      ctx.strokeStyle = '#ff66ff';
      ctx.lineWidth = 8;
      ctx.strokeRect(8, 8, 496, 240);
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, 488, 232);
      
      // Main text with glow effect
      ctx.shadowColor = '#ff66ff';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 72px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SHOP', 256, 100);
      
      // Currency symbol
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#00ffff';
      ctx.font = 'bold 48px monospace';
      ctx.fillText('[ $ ]', 256, 170);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture, 
        transparent: true,
        blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(2.4, 1.2, 1);
      sprite.position.y = 2.5;
      
      // Add pulsing glow effect
      const glowGeometry = new THREE.PlaneGeometry(2.2, 1.1);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff66ff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.y = 2.5;
      glow.position.z = -0.1;
      
      group.add(glow);
      group.add(frame);
      group.add(sprite);
      
      // Store original position for animation
      group.userData.baseY = 2.5;
      group.userData.time = Math.random() * Math.PI * 2;
      
      return group;
    } catch(_) {
      return null;
    }
  }

  // Track shop NPCs and their signs
  const shopNPCs = new Map();

  function showShop(city){
    // Don't show shop during cinematic
    if (window.__introRunning) return;
    
    let panel = document.getElementById('shopPanel');
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.id = 'shopPanel';
    panel.style.cssText = 'position:absolute;top:60px;right:20px;border:1px solid #00ffff;background:rgba(0,0,0,0.75);padding:8px 10px;z-index:1600;max-width:380px;';
    const title = document.createElement('div'); title.style.cssText='color:#00ffff;font:bold 14px monospace;margin-bottom:6px'; title.textContent = `Shop – ${city.name}`; panel.appendChild(title);
    const list = document.createElement('div'); list.style.cssText='max-height:260px;overflow:auto;'; panel.appendChild(list);
    const sectionW = document.createElement('div'); sectionW.style.cssText='color:#88ccff;font:12px monospace;margin:4px 0;'; sectionW.textContent = 'Weapons'; panel.appendChild(sectionW);
    // Create weapon variants
    const templates = Object.keys(WEAPONS);
    const variants = [];
    templates.forEach(t => {
      const v1 = { template: t, mods: { damage: Math.round(Math.random()*10), range: Math.round(Math.random()*10) } };
      const v2 = { template: t, mods: { cooldown: -Math.round(Math.random()*200), accuracy: +(Math.random()*0.1).toFixed(2) } };
      variants.push(v1, v2);
    });
    variants.slice(0, 10).forEach(v => {
      const base = WEAPONS[v.template]; if (!base) return;
      const row = document.createElement('div'); row.style.cssText='display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #003355;padding:6px 0;gap:8px';
      const l = document.createElement('div'); l.style.cssText='color:#ccffff;font:12px monospace;'; l.textContent = `${base.name}`; row.appendChild(l);
      const mods = document.createElement('div'); mods.style.cssText='color:#88ccff;font:10px monospace;opacity:0.85;'; mods.textContent = `${Object.entries(v.mods).map(([k,val])=>`${k}:${val}`).join(' ')}`; row.appendChild(mods);
      const btn = document.createElement('button'); btn.textContent = 'Buy'; btn.style.cssText='margin-left:6px'; row.appendChild(btn);
      list.appendChild(row);
      btn.onclick = () => { try { window.socket && window.socket.emit('buyItem', { kind: 'weapon', template: v.template, mods: v.mods, city: city.name }); } catch(_){} };
    });
    const sectionA = document.createElement('div'); sectionA.style.cssText='color:#88ccff;font:12px monospace;margin:8px 0 4px;'; sectionA.textContent = 'Armor'; panel.appendChild(sectionA);
    const armorKeys = Object.keys(ARMOR_TEMPLATES);
    armorKeys.forEach(key => {
      const base = ARMOR_TEMPLATES[key];
      // random slight variant
      const rm = { ...base.resist };
      Object.keys(rm).forEach(k=>{ rm[k] = Math.max(0, +(rm[k] + (Math.random()*0.08 - 0.04)).toFixed(2)); });
      const row = document.createElement('div'); row.style.cssText='display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #003355;padding:6px 0;gap:8px';
      const l = document.createElement('div'); l.style.cssText='color:#ccffcc;font:12px monospace;'; l.textContent = `${base.name}`; row.appendChild(l);
      const mods = document.createElement('div'); mods.style.cssText='color:#88ff88;font:10px monospace;opacity:0.85;';
      mods.textContent = Object.entries(rm).filter(([k,v])=>v>0).map(([k,v])=>`${k}:${Math.round(v*100)}%`).join(' ');
      row.appendChild(mods);
      const btn = document.createElement('button'); btn.textContent = 'Buy'; btn.style.cssText='margin-left:6px'; row.appendChild(btn);
      list.appendChild(row);
      btn.onclick = () => { try { window.socket && window.socket.emit('buyItem', { kind: 'armor', template: key, mods: { resist: rm }, city: city.name }); } catch(_){} };
    });
    const sectionD = document.createElement('div'); sectionD.style.cssText='color:#88ccff;font:12px monospace;margin:8px 0 4px;'; sectionD.textContent = 'Drones'; panel.appendChild(sectionD);
    Object.entries(DRONES).forEach(([key, d])=>{
      const row = document.createElement('div'); row.style.cssText='display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #003355;padding:6px 0;gap:8px';
      const l = document.createElement('div'); l.style.cssText='color:#ccccff;font:12px monospace;'; l.textContent = `${d.name}`; row.appendChild(l);
      const stats = document.createElement('div'); stats.style.cssText='color:#88ccff;font:10px monospace;opacity:0.85;'; stats.textContent = `cap:${d.capacity} spd:${d.speed}`; row.appendChild(stats);
      const btn = document.createElement('button'); btn.textContent = 'Buy'; row.appendChild(btn);
      btn.onclick = ()=>{ try { window.socket && window.socket.emit('buyItem', { kind: 'drone', template: key, mods: {}, city: city.name }); } catch(_){} };
      list.appendChild(row);
    });
    const closeBtn2 = document.createElement('button'); closeBtn2.textContent='Close'; closeBtn2.onclick = ()=>{ try { panel.remove(); } catch(_){} }; panel.appendChild(closeBtn2);
    document.body.appendChild(panel);
  }

  // Setup shop NPCs with 3D signs
  function setupShopNPCs() {
    if (!window.citizenSystem || !window.citizenSystem.citizens || !window.scene) return;
    
    // Clear existing shop NPCs
    shopNPCs.forEach((data, npc) => {
      if (data.sign && data.sign.parent) {
        data.sign.parent.remove(data.sign);
      }
    });
    shopNPCs.clear();
    
    // Add shop signs to some citizens in each city
    const cities = window.CITIES || [];
    cities.forEach(city => {
      const cityCitizens = window.citizenSystem.citizens.filter(c => c.city === city);
      if (cityCitizens.length > 0) {
        // Make the first citizen in each city a shopkeeper
        const shopkeeper = cityCitizens[0];
        const sign = createShopSign();
        if (sign) {
          sign.position.copy(shopkeeper.mesh.position);
          sign.position.y += 1.8; // Position above the NPC
          window.scene.add(sign);
          shopNPCs.set(shopkeeper, { sign, city });
          
          // Mark this citizen as a shopkeeper
          shopkeeper.isShopkeeper = true;
        }
      }
    });
  }

  // Handle shop NPC interaction
  function handleShopNPCClick(citizen) {
    if (shopNPCs.has(citizen)) {
      const shopData = shopNPCs.get(citizen);
      showShop(shopData.city);
      return true;
    }
    return false;
  }

  // Update shop sign positions and animations
  function updateShopSigns() {
    if (!window.camera) return;
    
    const time = performance.now() * 0.001; // Convert to seconds
    
    shopNPCs.forEach((data, npc) => {
      if (data.sign && npc.mesh) {
        // Update position relative to NPC
        data.sign.position.copy(npc.mesh.position);
        
        // Floating animation
        const baseY = data.sign.userData.baseY || 2.5;
        const timeOffset = data.sign.userData.time || 0;
        data.sign.position.y += baseY + Math.sin(time + timeOffset) * 0.1;
        
        // Make sign face camera
        data.sign.lookAt(window.camera.position);
        data.sign.rotation.x = 0; // Keep upright
        data.sign.rotation.z = 0; // Keep upright
        
        // Pulse the glow
        const glow = data.sign.children.find(child => child.geometry && child.geometry.type === 'PlaneGeometry');
        if (glow && glow.material) {
          glow.material.opacity = 0.2 + Math.sin(time * 2 + timeOffset) * 0.1;
        }
        
        // Slight rotation animation
        data.sign.rotation.y += Math.sin(time * 0.5 + timeOffset) * 0.01;
      }
    });
  }

  // Initialize shop NPCs when citizens are ready
  function initShopNPCs() {
    if (window.citizenSystem && window.citizenSystem.citizens && window.citizenSystem.citizens.length > 0) {
      setupShopNPCs();
    } else {
      // Retry after a short delay
      setTimeout(initShopNPCs, 500);
    }
  }

  // Start initialization
  setTimeout(initShopNPCs, 1000);

  // Get shop locations for compass
  function getShopLocations() {
    const locations = [];
    shopNPCs.forEach((data, npc) => {
      if (npc.mesh && data.city) {
        locations.push({
          x: npc.mesh.position.x,
          z: npc.mesh.position.z,
          cityName: data.city.name
        });
      }
    });
    return locations;
  }

  // Export functions for external use
  window.shopSystem = {
    handleShopNPCClick,
    updateShopSigns,
    setupShopNPCs,
    getShopLocations
  };

  // Update shop signs in animation loop
function tick() {
  updateShopSigns();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
})();

// City Defense Turrets System
(function setupCityDefenses(){
  const cityTurrets = new Map(); // Map cities to their defensive turrets
  
  function createDefenseTurret(x, z, city) {
    try {
      // Calculate terrain height
      let y = 1;
      if (typeof cartesianToGrid === 'function' && typeof tileSize !== 'undefined') {
        const grid = cartesianToGrid(x, z, tileSize);
        let h = null;
        try { if (typeof getCityHeight === 'function') h = getCityHeight(grid.x, grid.y); } catch(_) {}
        if (!Number.isFinite(h) && typeof getHeight === 'function') { try { h = getHeight(grid.x, grid.y); } catch(_){} }
        y = Number.isFinite(h) ? h + 0.6 : 1;
      }
      
      // Create turret base
      const baseGeometry = new THREE.CylinderGeometry(1.5, 2.0, 1.5, 8);
      const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x444444, emissive: 0x222222, emissiveIntensity: 0.3 });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      
      // Create turret barrel
      const barrelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2.5, 8);
      const barrelMaterial = new THREE.MeshPhongMaterial({ color: 0x666666, emissive: 0x333333, emissiveIntensity: 0.3 });
      const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
      barrel.position.y = 1.5;
      barrel.rotation.z = Math.PI / 2; // Point horizontally
      
      // Create turret group
      const turretGroup = new THREE.Group();
      turretGroup.add(base);
      turretGroup.add(barrel);
      turretGroup.position.set(x, y, z);
      
      // Add to scene
      if (window.scene) window.scene.add(turretGroup);
      
      // Create turret data for combat system
      const turretData = {
        type: 'cityDefense',
        mesh: turretGroup,
        barrel: barrel,
        position: turretGroup.position,
        city: city,
        range: 40,
        damage: 25,
        fireRate: 1000, // 1 second cooldown
        lastFire: 0,
        alive: true,
        data: {
          integrity: 200,
          maxIntegrity: 200,
          range: 40,
          damage: 25,
          fireRate: 1000
        }
      };
      
      return turretData;
    } catch(_) {
      return null;
    }
  }
  
  function setupCityTurrets() {
    if (!window.CITIES || !window.scene) return;
    
    // Clear existing turrets
    cityTurrets.forEach((turrets, city) => {
      turrets.forEach(turret => {
        if (turret.mesh && turret.mesh.parent) {
          turret.mesh.parent.remove(turret.mesh);
        }
      });
    });
    cityTurrets.clear();
    
    // Add defensive turrets around each city
    window.CITIES.forEach(city => {
      const turrets = [];
      const numTurrets = 6; // Number of turrets per city
      const turretDistance = (city.radius || 100) + 20; // Place turrets just outside city radius
      
      for (let i = 0; i < numTurrets; i++) {
        const angle = (i / numTurrets) * Math.PI * 2;
        const x = city.x + Math.cos(angle) * turretDistance;
        const z = city.z + Math.sin(angle) * turretDistance;
        
        const turret = createDefenseTurret(x, z, city);
        if (turret) {
          turrets.push(turret);
          // Add to combat system buildings for automatic targeting
          combatState.buildings.push(turret);
        }
      }
      
      cityTurrets.set(city, turrets);
    });
  }
  
  // Initialize city defenses when cities are ready
  function initCityDefenses() {
    if (window.CITIES && window.CITIES.length > 0) {
      setupCityTurrets();
    } else {
      // Retry after a short delay
      setTimeout(initCityDefenses, 1000);
    }
  }
  
  // Start initialization
  setTimeout(initCityDefenses, 2000);
  
  // Export for external use
  window.cityDefenseSystem = {
    setupCityTurrets,
    cityTurrets
  };
})();

// Trading UI
(function setupTradingUI(){
  // add minimal trade controls to Friends tab if present
  function wire(){
    const chatLog = document.getElementById('chatLog');
    if (!chatLog || window.__tradeWired) return;
    window.__tradeWired = true;
    function append(line){ const d=document.createElement('div'); d.innerHTML=line; chatLog.appendChild(d); chatLog.scrollTop = chatLog.scrollHeight; }
    if (window.socket) {
      window.socket.on('tradeRequest', ({ from }) => { append(`<span style="color:#ffaa88">Trade request from ${from}</span>`); });
      window.socket.on('tradeProposal', ({ from, itemId, credits }) => {
        append(`<span style="color:#ffff88">${from} offers ${credits}C for item ${itemId} <button id="acceptTradeBtn">Accept</button> <button id="declineTradeBtn">Decline</button></span>`);
        setTimeout(()=>{
          const a=document.getElementById('acceptTradeBtn'); const d=document.getElementById('declineTradeBtn');
          if (a) a.onclick = ()=>{ window.socket.emit('tradeAccept', { from, itemId, credits }); };
          if (d) d.onclick = ()=>{ window.socket.emit('tradeDecline', { from }); };
        }, 0);
      });
      window.socket.on('tradeResult', (res)=>{ if (res.ok) append(`<span style="color:#88ff88">Trade success (${res.role})</span>`); else append(`<span style="color:#ff8888">Trade failed: ${res.error||'error'}</span>`); });
    }
  }
  setInterval(wire, 1000);
})();

// Difficulty mapping across world
function getDifficultyAt(x, z) {
  try {
    const axial = (typeof cartesianToAxial === 'function') ? cartesianToAxial(x, z, tileSize) : { q: Math.round(x/(window.tileSize||2)), r: Math.round(z/(window.tileSize||2)) };
    const dist = Math.sqrt(axial.q*axial.q + axial.r*axial.r);
    // Normalize distance (0 at center, ~1 beyond radius ~1000 tiles)
    const distNorm = Math.max(0, Math.min(1, dist / 1000));
    // Height factor (higher terrain a bit harder)
    let h = 0; try { h = window.sampleGroundHeightAt ? window.sampleGroundHeightAt(x, z) : 0; } catch(_){}
    const hNorm = Math.max(0, Math.min(1, (h - 1.5) / 12));
      // City proximity softening (near city centers easier)
  let cityEase = 0;
  try {
    if (Array.isArray(window.CITIES)) {
      let nearest = Infinity;
      window.CITIES.forEach(c => { 
        const dx = x - c.x; 
        const dz = z - c.z; 
        const d2 = Math.sqrt(dx*dx + dz*dz) - (c.radius||100); 
        if (d2 < nearest) nearest = d2; 
      });
      cityEase = Math.max(0, Math.min(1, (200 - nearest) / 200)); // near city => higher ease
    }
  } catch(_){}
  // Compose difficulty: distance and height raise difficulty, cityEase lowers it
  let d = distNorm*0.65 + hNorm*0.35 - cityEase*0.35;
  // Clamp and jitter for variety
  const jitter = ((Math.sin(axial.q*12.9898 + axial.r*78.233) * 43758.5453) % 1) * 0.08 - 0.04;
  d = Math.max(0, Math.min(1, d + jitter));
  return d;
} catch(_) { return 0.3; }
}

function pickEnemyTypeForDifficulty(difficulty, score) {
  const pool = [];
  if (difficulty < 0.25) {
    // Easy enemies
    pool.push('shill', 'shill', 'synthetic', 'synthetic', 'paperhand');
  } else if (difficulty < 0.5) {
    // Medium enemies
    pool.push('shill', 'paperhand', 'fudster', 'algobot', 'synthetic');
  } else if (difficulty < 0.75) {
    // Hard enemies
    pool.push('fudster', 'marketmaker', 'algobot', 'darkpool', 'basher');
  } else {
    // Very hard enemies
    pool.push('marketmaker', 'darkpool', 'hedgie', 'algobot', 'basher');
  }
  // Add tougher enemies based on score
  if (score > 200) pool.push('darkpool', 'basher');
  if (score > 400) pool.push('hedgie', 'marketmaker');
  if (score > 600) pool.push('hedgie'); // More bosses at high scores
  
  // Keep original script enemies for special cases
  if (Math.random() < 0.1) pool.push('script', 'script_phantom');
  
  return pool[Math.floor(Math.random() * pool.length)];
}

// Drone system: follow, inventory, equipment, assist attack
(function setupDrones(){
  const drones = [];
  function spawnDrone(defKey){
    const def = { name: 'Drone', capacity: 10, speed: 0.1, baseArmor: {}, baseWeapon: 'pulseSMG' };
    const presets = { drone_mk1: { capacity: 12, speed: 0.09, baseArmor: { kinetic: 0.1 }, baseWeapon: 'pulseSMG' }, drone_mk2: { capacity: 18, speed: 0.11, baseArmor: { kinetic: 0.15, electric: 0.1 }, baseWeapon: 'energyDischarger' } };
    const data = Object.assign(def, presets[defKey]||{});
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), new THREE.MeshPhongMaterial({ color: 0x66ccff, emissive: 0x004466, emissiveIntensity: 0.5 }));
    const arms = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 12), new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.5 }));
    arms.rotation.x = Math.PI/2; const grp = new THREE.Group(); grp.add(body); grp.add(arms);
    if (window.player) { grp.position.copy(window.player.position.clone().add(new THREE.Vector3(0.8, 1.2, 0.8))); }
    window.scene.add(grp);
    const drone = { mesh: grp, data, cargo: [], equip: { weapon: data.baseWeapon, armor: data.baseArmor }, lastShot: 0 };
    drones.push(drone);
    return drone;
  }
  function tick(deltaTime){
    if (!window.player) return;
    const t = deltaTime * 0.06;
    drones.forEach(d => {
      const target = window.player.position.clone().add(new THREE.Vector3(0.8, 1.2, 0.8));
      const dir = new THREE.Vector3().subVectors(target, d.mesh.position);
      const dist = dir.length(); dir.normalize();
      const step = d.data.speed * t * (dist>0.2?1:0);
      d.mesh.position.add(dir.multiplyScalar(step));
      // Assist attack on nearest enemy within 18u
      try {
        const enemies = (window.combatSystem && window.combatSystem.combatState) ? window.combatSystem.combatState.enemies.filter(e=>e.alive) : [];
        let ne = null; let nd = 18;
        enemies.forEach(e=>{ const de = e.position.distanceTo(d.mesh.position); if (de<nd) { nd=de; ne=e; } });
        const now = Date.now();
        if (ne) {
          const w = window.combatSystem.WEAPONS[d.equip.weapon] || { damage: 8, range: 18, cooldown: 600, projectileSpeed: 1.2, color: 0x66ccff };
          const rateScale = (d._rateScaleUntil && now<d._rateScaleUntil) ? (d._rateScale||1) : 1; if (now - d.lastShot > w.cooldown * rateScale) {
            d.lastShot = now;
            // simple projectile towards enemy
            const geom = new THREE.SphereGeometry(0.1, 6, 6); const mat = new THREE.MeshBasicMaterial({ color: w.color||0x66ccff });
            const proj = new THREE.Mesh(geom, mat); proj.position.copy(d.mesh.position.clone().add(new THREE.Vector3(0,0.2,0))); window.scene.add(proj);
            const vel = new THREE.Vector3().subVectors(ne.position, proj.position).normalize().multiplyScalar((w.projectileSpeed||1.2));
            window.combatSystem.combatState.projectiles.push({ mesh: proj, position: proj.position, velocity: vel, damage: w.damage*0.6, owner: 'drone', distanceTraveled: 0, maxRange: w.range, alive: true, target: ne });
          }
        }
      } catch(_){}
    });
  }
  function openDroneEquipUI(){
    const container = document.createElement('div');
    container.id = 'droneEquipUI';
    container.style.cssText = 'position:absolute;top:80px;left:20px;background:rgba(0,0,0,0.7);border:1px solid #00ffff;color:#ccffff;font:12px monospace;padding:10px;z-index:1800;';
    const list = document.createElement('div'); list.style.cssText='max-height:200px;overflow:auto;'; container.appendChild(list);
    drones.forEach((d, idx)=>{
      const row = document.createElement('div'); row.style.cssText='border-bottom:1px solid #003355;padding:6px 0;';
      row.innerHTML = `<div><b>Drone ${idx+1}</b> (cap:${d.data.capacity})</div>
        <div>Weapon: <select data-type="weapon" data-idx="${idx}">${Object.keys(window.combatSystem.WEAPONS).map(k=>`<option value="${k}" ${d.equip.weapon===k?'selected':''}>${window.combatSystem.WEAPONS[k].name}</option>`).join('')}</select></div>
        <div>Armor: <button data-type="armor" data-idx="${idx}">Set Armor (from equipped)</button></div>`;
      list.appendChild(row);
    });
    const closeBtn = document.createElement('button'); closeBtn.textContent='Close'; closeBtn.onclick=()=>container.remove(); container.appendChild(closeBtn);
    container.addEventListener('change', (e)=>{
      const sel = e.target; if (sel.tagName!=='SELECT') return; const idx = Number(sel.getAttribute('data-idx')); const t = sel.getAttribute('data-type');
      if (t==='weapon') { drones[idx].equip.weapon = sel.value; }
    });
    container.addEventListener('click', (e)=>{
      const btn = e.target; if (btn.tagName!=='BUTTON' || btn.getAttribute('data-type')!=='armor') return; const idx = Number(btn.getAttribute('data-idx'));
      drones[idx].equip.armor = Object.assign({}, window.__equippedArmorResists||{});
    });
    document.body.appendChild(container);
  }
  // Bind key U to open drone equip UI
  window.addEventListener('keydown', (e)=>{ if (e.code==='KeyU' && window.menuSystem && window.menuSystem.isOpen) { openDroneEquipUI(); } });
  window.droneSystem = { drones, spawnDrone, tick };
})();

// Hook economy purchase to spawn drones client-side
(function wireDronePurchases(){
  if (!window.socket) return;
  window.socket.on('purchaseResult', (res)=>{
    try { if (res.ok && res.item && res.item.type==='drone') { window.droneSystem && window.droneSystem.spawnDrone(res.item.template); window.menuSystem && window.menuSystem.showNotification(`${res.item.name} deployed`); } } catch(_){}
  });
})();

// Drone tick will be invoked from game loop in gameInit.js

// Debug logging system with categories
const DEBUG_CATEGORIES = {
  COMBAT: false,
  ENEMY: false,
  BUILDING: false,
  TERRAIN: false,
  NETWORK: false,
  RESOURCE: false,
  GENERAL: false,
  PLAYER_HEIGHT: false,  // Disabled player height debug
  CINEMATIC_CHUNKS: false  // Debug for chunks loaded during cinematic
};

function debugLog(category, ...args) {
  // Debug logging disabled
}

// Export debug system
window.debugLog = debugLog;
window.DEBUG_CATEGORIES = DEBUG_CATEGORIES;

// Helper function to toggle debug categories from console
window.toggleDebug = function(category, state) {
  if (category === 'all') {
    Object.keys(DEBUG_CATEGORIES).forEach(cat => {
      DEBUG_CATEGORIES[cat] = state !== undefined ? state : !DEBUG_CATEGORIES[cat];
    });

  } else if (DEBUG_CATEGORIES.hasOwnProperty(category)) {
    if (state !== undefined) {
      DEBUG_CATEGORIES[category] = state;
    } else {
      DEBUG_CATEGORIES[category] = !DEBUG_CATEGORIES[category];
    }

  } else {

  }
  return DEBUG_CATEGORIES;
};

// Player height debug timer
let lastPlayerHeightDebug = 0;
function terrainDebugTick() {
  const now = Date.now();
  if (now - lastPlayerHeightDebug < 10000) return; // Every 10 seconds
  lastPlayerHeightDebug = now;
  
  if (!window.player) return;
  
  try {
    const pos = window.player.position;
    const grid = window.cartesianToGrid(pos.x, pos.z, window.tileSize || 2);
    
    // Get terrain height (base noise)
    const terrainHeight = window.getHeight ? window.getHeight(grid.x, grid.y) : 0;
    
    // Get city override height
    const cityHeight = window.getCityHeight ? window.getCityHeight(grid.x, grid.y) : null;
    
    // Get actual tile height (what should be used)
    const actualHeight = cityHeight !== null ? cityHeight : terrainHeight;
    
    // Check if this is marked as a city tile
    const isCityTile = window.CITY_TILE_KEYS && window.CITY_TILE_KEYS.has(`${grid.x},${grid.y}`);
    
    // Get additional player state info
    const isJumping = window.player.userData && window.player.userData.jumping;
    const velocity = window.player.userData && window.player.userData.velocity ? window.player.userData.velocity.y : 0;
    const bobBaseY = window.__bobBaseY || 0;
    const playerRadius = window.player.userData && window.player.userData.radius || 0.5;
    const playerYOffset = window.PLAYER_Y_OFFSET || 0.6;
    const expectedY = Math.max(actualHeight + playerYOffset, 1.0);
    const heightDifference = pos.y - expectedY;
    
    // Check nearby tiles for height differences
    const nearbyHeights = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        const nearGrid = { x: grid.x + dx, y: grid.y + dz };
        const nearTerrain = window.getHeight ? window.getHeight(nearGrid.x, nearGrid.y) : 0;
        const nearCity = window.getCityHeight ? window.getCityHeight(nearGrid.x, nearGrid.y) : null;
        const nearActual = nearCity !== null ? nearCity : nearTerrain;
        nearbyHeights.push({ dx, dz, height: nearActual });
      }
    }
    const heightVariance = Math.max(...nearbyHeights.map(h => h.height)) - Math.min(...nearbyHeights.map(h => h.height));
    
    debugLog('PLAYER_HEIGHT', `
========== PLAYER HEIGHT DEBUG ==========
Player World Position: (${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)})
Grid Coordinates: (${grid.x}, ${grid.y})

TERRAIN DATA:
  Base Terrain Height: ${terrainHeight.toFixed(3)}
  City Override Height: ${cityHeight !== null ? cityHeight.toFixed(3) : 'NONE'}
  Actual Tile Height: ${actualHeight.toFixed(3)}
  Is City Tile: ${isCityTile}
  
PLAYER STATE:
  Current Y Position: ${pos.y.toFixed(3)}
  Expected Y Position: ${expectedY.toFixed(3)} (tile + offset)
  Height Difference: ${heightDifference.toFixed(3)} (actual - expected)
  Player Y Offset Constant: ${playerYOffset.toFixed(3)}
  Height Above Tile: ${(pos.y - actualHeight).toFixed(3)} units
  Player Radius: ${playerRadius.toFixed(3)}
  Is Jumping: ${isJumping}
  Y Velocity: ${velocity.toFixed(3)}
  Bob Base Y: ${bobBaseY.toFixed(3)}
  
NEARBY TILES:
  Height Variance: ${heightVariance.toFixed(3)}
  Max Nearby: ${Math.max(...nearbyHeights.map(h => h.height)).toFixed(3)}
  Min Nearby: ${Math.min(...nearbyHeights.map(h => h.height)).toFixed(3)}
==========================================`);
  } catch(e) {
    debugLog('PLAYER_HEIGHT', 'Error getting player height debug info:', e);
  }
}