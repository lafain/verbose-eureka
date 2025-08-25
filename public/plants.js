(function(){
  const PLANT_TYPES = {
    spikePine: { kind: 'tree', color: 0x447744, trunk: 0x553311, size: 1.4 },
    stubOak: { kind: 'tree', color: 0x558855, trunk: 0x442211, size: 1.6 },
    crystalTwig: { kind: 'tree', color: 0x88ccff, trunk: 0x113344, size: 1.2 },
    fanPalm: { kind: 'tree', color: 0x66aa66, trunk: 0x775533, size: 1.8 },
    mushroomTree: { kind: 'tree', color: 0xff6666, trunk: 0x663333, size: 1.3 },
    tuftGrass: { kind: 'grass', color: 0x77aa55, size: 0.6 },
    bladePatch: { kind: 'grass', color: 0x88cc66, size: 0.7 },
    fanGrass: { kind: 'grass', color: 0x99dd77, size: 0.8 }
  };

  const plants = new Map(); // id -> { data, mesh, collider }

  function makeTreeMesh(typeDef){
    const g = new THREE.Group();
    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12 * typeDef.size, 0.18 * typeDef.size, 0.9 * typeDef.size, 6),
      new THREE.MeshPhongMaterial({ color: typeDef.trunk })
    );
    trunk.position.y = 0.45 * typeDef.size;
    g.add(trunk);
    // Canopy - low poly cone or octahedron
    const canopyGeo = new THREE.ConeGeometry(0.7 * typeDef.size, 1.0 * typeDef.size, 6);
    const canopy = new THREE.Mesh(canopyGeo, new THREE.MeshPhongMaterial({ color: typeDef.color, flatShading: true }));
    canopy.position.y = 1.2 * typeDef.size;
    g.add(canopy);
    return g;
  }

  function makeGrassMesh(typeDef){
    const g = new THREE.Group();
    const bladeMat = new THREE.MeshPhongMaterial({ color: typeDef.color, flatShading: true });
    for (let i=0;i<5;i++){
      const w = 0.04 * typeDef.size + Math.random()*0.04;
      const h = 0.25 * typeDef.size + Math.random()*0.25;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), bladeMat);
      blade.position.set((Math.random()-0.5)*0.3, h/2, (Math.random()-0.5)*0.3);
      blade.rotation.y = Math.random()*Math.PI;
      g.add(blade);
    }
    return g;
  }

  function createPlantMesh(p){
    const def = PLANT_TYPES[p.type] || PLANT_TYPES.spikePine;
    const mesh = def.kind === 'tree' ? makeTreeMesh(def) : makeGrassMesh(def);
    const y = (typeof window.sampleGroundHeightAt==='function') ? (window.sampleGroundHeightAt(p.x, p.z) + 0.02) : 0.02;
    mesh.position.set(p.x, y, p.z);
    if (def.kind === 'tree') mesh.userData.blocking = true;
    return mesh;
  }

  function addPlant(p){
    try {
      if (plants.has(p.id)) return;
      const mesh = createPlantMesh(p);
      scene && scene.add(mesh);
      const box = new THREE.Box3().setFromObject(mesh);
      plants.set(p.id, { data: p, mesh, box });
    } catch(_){}
  }

  function removePlant(id){
    const ent = plants.get(id);
    if (!ent) return;
    try { ent.mesh && ent.mesh.parent && ent.mesh.parent.remove(ent.mesh); } catch(_){}
    plants.delete(id);
  }

  function loadFromWorld(plantsArr){
    try {
      (plantsArr||[]).forEach(p => { if (p.alive) addPlant(p); });
    } catch(_){}
  }

  function tryAttackNearestTree(){
    try {
      if (!window.player || !window.socket) return;
      let best = null; let bestD = 2.2;
      plants.forEach((ent)=>{
        const def = PLANT_TYPES[ent.data.type] || {}; if ((def.kind||'') !== 'tree') return;
        const d = ent.mesh.position.distanceTo(window.player.position);
        if (d < bestD) { bestD = d; best = ent; }
      });
      if (best) {
        // visual chop feedback
        try {
          best.mesh.scale.y *= 0.9;
          best.mesh.scale.x *= 0.98; best.mesh.scale.z *= 0.98;
        } catch(_){}
        // send destruction after a couple chops threshold
        best.data.__hits = (best.data.__hits||0) + 1;
        if (best.data.__hits >= 3) {
          window.socket.emit('destroyPlant', { id: best.data.id });
          best.data.__hits = 0;
        }
      }
    } catch(_){}
  }

  // Movement collision: prevent passing through tree trunks (simple pushback)
  function blockTrees(playerPrev){
    try {
      if (!window.player) return;
      const pos = window.player.position;
      let blocked = false;
      plants.forEach(ent => {
        const def = PLANT_TYPES[ent.data.type] || {}; if ((def.kind||'') !== 'tree') return;
        const dx = pos.x - ent.mesh.position.x; const dz = pos.z - ent.mesh.position.z;
        const d2 = dx*dx + dz*dz; const r = 0.7 * (def.size||1.4); // approximate trunk radius
        if (d2 < r*r) { blocked = true; }
      });
      if (blocked && playerPrev) { pos.x = playerPrev.x; pos.z = playerPrev.z; }
    } catch(_){}
  }

  // Wire networking events
  function wireSocket(){
    if (!window.socket) return;
    if (window.__plantsWired) return; window.__plantsWired = true;
    window.socket.on('plantRemoved', ({ id }) => { removePlant(id); });
    window.socket.on('plantSpawn', (p) => { addPlant(p); });
  }

  // Bind input: simple attack key against trees (uses existing combat fire key fallback E)
  function bindInputs(){
    window.addEventListener('keydown', (e)=>{
      if (e.code === 'KeyF') { // F: attack nearest tree in reach
        tryAttackNearestTree();
      }
    });
  }

  // Hook into world state load
  (function hookWorldState(){
    const prev = window.applyWorldState;
    window.applyWorldState = function(){
      try { prev && prev(); } catch(_){}
      try { if (Array.isArray(window.__worldPlants)) { loadFromWorld(window.__worldPlants); } } catch(_){}
    };
  })();

  // Hook into networking worldState to capture plants array
  (function hookNetworking(){
    const prevIo = window.io;
    if (typeof prevIo === 'function') {
      window.io = function(...args){
        const s = prevIo.apply(this, args);
        s.on('worldState', (payload)=>{ try { window.__worldPlants = payload.plants || []; loadFromWorld(window.__worldPlants); } catch(_){} });
        setTimeout(wireSocket, 0);
        return s;
      };
    } else {
      setTimeout(wireSocket, 250);
    }
  })();

  // Export and hooks
  window.plantSystem = { addPlant, removePlant, loadFromWorld, tryAttackNearestTree, blockTrees };
  bindInputs();
})(); 