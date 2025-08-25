(function(){
  const TYPES = {
    hexDust: { color: 0xccccff },
    luminGrain: { color: 0xffff99 },
    synthFibers: { color: 0x99ffcc },
    kineStrand: { color: 0xffcc99 },
    voidResidue: { color: 0x8844ff },
    cryoShards: { color: 0x99ddff },
    pyroFilament: { color: 0xff8844 },
    voltCoil: { color: 0x66ddff }
  };
  const fields = [];
  const tileSize = ()=> window.tileSize||2;

  function randomCityRing(city, innerFactor, outerFactor){
    const minR = (city.radius||100) * innerFactor;
    const maxR = (city.radius||100) * outerFactor;
    const a = Math.random()*Math.PI*2;
    const r = minR + Math.random()*(maxR-minR);
    return { x: city.x + Math.cos(a)*r, z: city.z + Math.sin(a)*r };
  }

  function makeFieldAt(x, z, typeKey, count){
    const group = new THREE.Group();
    const col = TYPES[typeKey] ? TYPES[typeKey].color : 0xffffff;
    const mat = new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.1 });
    const nodes = [];
    for (let i=0;i<count;i++){
      const gx = (Math.random()-0.5) * tileSize() * 2.5;
      const gz = (Math.random()-0.5) * tileSize() * 2.5;
      const size = 0.3 + Math.random()*0.25;
      const cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat);
      cube.position.set(x+gx, sampleY(x+gx, z+gz), z+gz);
      group.add(cube);
      nodes.push({ mesh: cube, maturity: Math.random(), available: true });
    }
    window.scene.add(group);
    const field = { type: typeKey, group, nodes, center: new THREE.Vector3(x, sampleY(x,z), z) };
    fields.push(field);
    return field;
  }

  function sampleY(x,z){
    try {
      const h = (typeof window.sampleGroundHeightAt==='function') ? window.sampleGroundHeightAt(x,z) : 0.8;
      return Number.isFinite(h) ? h + (window.CHARACTER_Y_OFFSET||0.6) : 1.0;
    } catch(_) { return 1.0; }
  }

  function initFields(){
    if (!window.scene || !Array.isArray(window.CITIES)) return;
    // Clear existing
    try { fields.splice(0, fields.length); } catch(_){}
    // Around each city, spawn 3-5 fields of random types
    window.CITIES.forEach(city => {
      const num = 3 + Math.floor(Math.random()*3);
      const keys = Object.keys(TYPES);
      for (let i=0;i<num;i++){
        const p = randomCityRing(city, 1.2, 2.2);
        makeFieldAt(p.x, p.z, keys[Math.floor(Math.random()*keys.length)], 8 + Math.floor(Math.random()*6));
      }
    });
  }

  function tick(deltaTime){
    const hb = window.__harvestBoost;
    // Regrow maturity over time; hide/show cubes by maturity
    fields.forEach(f => {
      const boost = (hb && hb.t && performance.now() < hb.t && hb.center.distanceTo(f.center) <= hb.r) ? (hb.mult||1) : 1;
      f.nodes.forEach(n => {
        // regrow at ~0.02 per second * boost
        n.maturity = Math.min(1, n.maturity + 0.02 * boost * (deltaTime*0.001));
        const visible = n.maturity >= 0.25;
        if (n.mesh) n.mesh.visible = visible;
      });
    });
  }

  function harvestNearest(playerPos){
    let best = null; let bestD = 2.2;
    fields.forEach(f => f.nodes.forEach(n => {
      if (!n.mesh || !n.mesh.visible) return;
      const d = n.mesh.position.distanceTo(playerPos);
      if (d < bestD) { bestD = d; best = { f, n }; }
    }));
    if (!best) return false;
    // Collect based on field type
    try {
      const res = (window.combatState && window.combatState.playerStats && window.combatState.playerStats.resources) ? window.combatState.playerStats.resources : null;
      if (res) {
        const k = best.f.type;
        res[k] = (res[k]||0) + 1;
        if (window.menuSystem) {
          // map server resource id to menu item id naming
          const idMap = { hexDust: 'hex_dust', luminGrain: 'lumin_grain', synthFibers: 'synth_fibers', kineStrand: 'kine_strand', voidResidue: 'void_residue', cryoShards: 'cryo_shards', pyroFilament: 'pyro_filament', voltCoil: 'volt_coil' };
          const iid = idMap[k] || k;
          window.menuSystem.addItem(iid, 1);
        }
        // reduce maturity and hide for regrow
        best.n.maturity = 0;
        if (best.n.mesh) best.n.mesh.visible = false;
        // floating text
        try { window.showFloatingText(best.n.mesh.position, '+1', '#88ff88', 650); } catch(_){}
        return true;
      }
    } catch(_){}
    return false;
  }

  function bindHarvestInput(){
    window.addEventListener('keydown', (e)=>{
      if (e.code === 'KeyE') {
        try { if (window.player) harvestNearest(window.player.position); } catch(_){}
      }
    });
    window.addEventListener('mousedown', (e)=>{
      if (e.button === 2) { // right click
        try { if (window.player) harvestNearest(window.player.position); } catch(_){}
      }
    });
  }

  bindHarvestInput();
  window.resourceSystem = { initFields, tick, harvestNearest };
})(); 