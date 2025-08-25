(function(){
  const citizens = [];
  const TALK_LINES = [
    "I like the stock.",
    "DRS your shares, bestie.",
    "Computershare? More like Computer-CARE.",
    "No dates, no prices. Just vibes.",
    "Ape together strong.",
    "Can’t stop, won’t stop, DRS.",
    "RC tweeted a chair again. Bullish.",
    "Ken's pool? Closed.",
    "Direct register, sleep better.",
    "Float? Let's see it in purple.",
    "HODL and hydrate.",
    "Floor is lava, shares are registered.",
    "Did you turn off share lending?",
    "Banana budget allocated to DRS.",
    "One share at a time."
  ];

  function randIn(min, max){ return min + Math.random() * (max-min); }
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function sampleY(x,z){
    try {
      const h = (typeof window.sampleGroundHeightAt==='function') ? window.sampleGroundHeightAt(x,z) : 0.8;
      return Number.isFinite(h) ? h + (window.CHARACTER_Y_OFFSET||0.6) : 1.0;
    } catch(_) { return 1.0; }
  }

  function spawnCitizensForCity(city){
    if (!window.scene) return;
    const count = Math.max(3, Math.floor((city.radius||100) / 50));
    for (let i=0;i<count;i++){
      const ang = Math.random()*Math.PI*2;
      const r = (city.radius||100) * Math.sqrt(Math.random()) * 0.8;
      const x = city.x + Math.cos(ang)*r;
      const z = city.z + Math.sin(ang)*r;
      const y = sampleY(x,z);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.0, 8), new THREE.MeshPhongMaterial({ color: 0x88ffcc, emissive: 0x113322, emissiveIntensity: 0.25 }));
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshPhongMaterial({ color: 0xffffdd }));
      head.position.y = 0.7;
      const group = new THREE.Group(); group.add(body); group.add(head);
      group.position.set(x, y, z);
      group.castShadow = false; group.receiveShadow = false;
      window.scene.add(group);
      const c = {
        mesh: group,
        city,
        state: 'idle',
        nextThinkAt: 0,
        speed: 0.04 + Math.random()*0.03,
        target: null,
        sayUntil: 0,
        bubble: null
      };
      citizens.push(c);
    }
  }

  function clampToCity(cit, nx, nz){
    const cx = cit.city.x, cz = cit.city.z, r = (cit.city.radius||100) * 0.95;
    const dx = nx - cx, dz = nz - cz; const d = Math.sqrt(dx*dx + dz*dz);
    if (d > r) { const k = r/d; return { x: cx + dx*k, z: cz + dz*k }; }
    return { x: nx, z: nz };
  }

  function removeBubble(b){ try { if (b && b.parentNode) b.parentNode.removeChild(b); } catch(_){} }
  function showBubble(cit, text){
    removeBubble(cit.bubble);
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute;background:rgba(0,0,0,0.7);color:#ccffcc;border:1px solid #00ff99;padding:6px 8px;border-radius:6px;font:12px monospace;pointer-events:none;z-index:2000;max-width:220px;';
    div.textContent = text;
    document.body.appendChild(div);
    cit.bubble = div;
    cit.sayUntil = performance.now() + 3000 + Math.random()*2000;
    // initial place
    positionBubble(cit);
  }
  function positionBubble(cit){
    try {
      if (!cit.bubble || !window.camera || !window.renderer) return;
      const p = cit.mesh.position.clone(); p.y += 1.2;
      const proj = p.project(window.camera);
      const x = (proj.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-proj.y * 0.5 + 0.5) * window.innerHeight - 30;
      cit.bubble.style.left = `${Math.round(x)}px`;
      cit.bubble.style.top = `${Math.round(y)}px`;
    } catch(_){}
  }

  function talkToCitizen(cit){
    if (!cit) return;
    showBubble(cit, pick(TALK_LINES));
  }

  function tickCitizens(deltaTime){
    const now = performance.now();
    for (const c of citizens){
      // bubble tracking and expiry
      if (c.bubble){
        if (now > c.sayUntil) { removeBubble(c.bubble); c.bubble = null; }
        else positionBubble(c);
      }
      if (now < c.nextThinkAt) continue;
      c.nextThinkAt = now + (c.state==='idle' ? 400 + Math.random()*400 : 120 + Math.random()*120);
      if (c.state === 'idle'){
        // choose a wander target
        const ang = Math.random()*Math.PI*2; const dist = 3 + Math.random()*6;
        const nx = c.mesh.position.x + Math.cos(ang)*dist;
        const nz = c.mesh.position.z + Math.sin(ang)*dist;
        const clamped = clampToCity(c, nx, nz);
        c.target = new THREE.Vector3(clamped.x, sampleY(clamped.x, clamped.z), clamped.z);
        c.state = 'walk';
      } else if (c.state === 'walk'){
        if (c.target){
          const dir = new THREE.Vector3().subVectors(c.target, c.mesh.position);
          const d = dir.length();
          if (d < 0.3) { c.state = 'idle'; c.target = null; }
          else {
            dir.normalize();
            const step = c.speed * (deltaTime * 0.06);
            const nx = c.mesh.position.x + dir.x * step;
            const nz = c.mesh.position.z + dir.z * step;
            const cl = clampToCity(c, nx, nz);
            c.mesh.position.x = cl.x; c.mesh.position.z = cl.z; c.mesh.position.y = sampleY(cl.x, cl.z);
            c.mesh.lookAt(new THREE.Vector3(c.mesh.position.x + dir.x, c.mesh.position.y, c.mesh.position.z + dir.z));
            // chance to say something while walking
            if (!c.bubble && Math.random() < 0.02) talkToCitizen(c);
          }
        } else { c.state = 'idle'; }
      }
    }
  }

  function pickCitizenUnderPointer(clientX, clientY){
    try {
      if (!window.camera || !window.renderer) return null;
      const rect = window.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(mouse, window.camera);
      const meshes = citizens.map(c=>c.mesh);
      const inter = raycaster.intersectObjects(meshes, false);
      if (inter && inter.length){
        const hit = inter[0].object;
        return citizens.find(c => c.mesh === hit || (hit.parent && c.mesh === hit.parent)) || null;
      }
    } catch(_){}
    return null;
  }

  function initCitizens(){
    try {
      if (!Array.isArray(window.CITIES) || !window.scene) return;
      citizens.splice(0, citizens.length);
      window.CITIES.forEach(spawnCitizensForCity);
    } catch(_){}
  }

  function nearestCitizenToPlayer(maxDist){
    try {
      if (!window.player) return null;
      let best = null; let bestD = (Number.isFinite(maxDist) ? maxDist : 3.0);
      citizens.forEach(c => {
        const d = c.mesh.position.distanceTo(window.player.position);
        if (d < bestD) { bestD = d; best = c; }
      });
      return best;
    } catch(_) { return null; }
  }

  window.citizenSystem = { citizens, initCitizens, tickCitizens, pickCitizenUnderPointer, talkToCitizen, nearestCitizenToPlayer };
})(); 