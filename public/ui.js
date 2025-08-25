// UI helpers: build timestamp, debug export, fullscreen, HUD updates, and event wiring

// Lightweight console/error capture for debug export
(function initDebugCapture(){
  try {
    if (!window.__ftd_logBuffer) {
      window.__ftd_logBuffer = [];
      const orig = { log: console.log, warn: console.warn, error: console.error };
      ['log','warn','error'].forEach(level => {
        const fn = orig[level];
        console[level] = function(...args){
          try { window.__ftd_logBuffer.push({ t: Date.now(), level, msg: args.map(a=>{ try { return typeof a==='object'? JSON.stringify(a): String(a);} catch(_) { return String(a);} }).join(' ') }); if (window.__ftd_logBuffer.length>500) window.__ftd_logBuffer.shift(); } catch(_){}
          fn && fn.apply(console, args);
        };
      });
      window.addEventListener('error', (e)=>{ try { window.__ftd_logBuffer.push({ t: Date.now(), level:'window.error', msg: `${e.message} @${e.filename}:${e.lineno}:${e.colno}`}); } catch(_){} });
      window.addEventListener('unhandledrejection', (e)=>{ try { window.__ftd_logBuffer.push({ t: Date.now(), level:'promise', msg: String(e.reason) }); } catch(_){} });
    }
  } catch(_){}
})();

async function gatherMobileDiagnostics(){
  const diag = {};
  try {
    diag.userAgent = navigator.userAgent;
    diag.uaData = navigator.userAgentData ? await navigator.userAgentData.toJSON() : null;
    diag.vendor = navigator.vendor; diag.platform = navigator.platform; diag.language = navigator.language; diag.languages = navigator.languages;
    diag.dpr = window.devicePixelRatio; diag.vw = window.innerWidth; diag.vh = window.innerHeight;
    diag.visualViewport = window.visualViewport ? { width: window.visualViewport.width, height: window.visualViewport.height, scale: window.visualViewport.scale } : null;
    diag.screen = { width: screen.width, height: screen.height, availWidth: screen.availWidth, availHeight: screen.availHeight, orientation: screen.orientation ? { type: screen.orientation.type, angle: screen.orientation.angle } : null };
    diag.touch = { maxTouchPoints: navigator.maxTouchPoints, ontouchstart: 'ontouchstart' in window };
    diag.pointer = { pointerEnabled: !!window.PointerEvent };
    diag.hardware = { cores: navigator.hardwareConcurrency || null, deviceMemory: navigator.deviceMemory || null };
    diag.connection = (navigator.connection ? { type: navigator.connection.type, effectiveType: navigator.connection.effectiveType, downlink: navigator.connection.downlink, rtt: navigator.connection.rtt, saveData: navigator.connection.saveData } : null);
    // WebGL/GPU
    try {
      const c = document.createElement('canvas'); const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        diag.webgl = {
          vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
          renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
          version: gl.getParameter(gl.VERSION)
        };
      }
    } catch(_){}
    // Battery
    try { if (navigator.getBattery) { const b = await navigator.getBattery(); diag.battery = { charging: b.charging, level: b.level, chargingTime: b.chargingTime, dischargingTime: b.dischargingTime }; } } catch(_){}
    // Permissions snapshot (best-effort)
    try {
      const kinds = ['geolocation','notifications','camera','microphone'];
      diag.permissions = {};
      if (navigator.permissions && navigator.permissions.query) {
        await Promise.all(kinds.map(async k => { try { const st = await navigator.permissions.query({ name: k }); diag.permissions[k] = st.state; } catch(_) { diag.permissions[k] = 'unknown'; } }));
      }
    } catch(_){}
    // Performance
    const nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    diag.performance = { timeOrigin: performance.timeOrigin, now: performance.now(), navigation: nav ? { type: nav.type, startTime: nav.startTime, domContentLoaded: nav.domContentLoadedEventEnd, loadEventEnd: nav.loadEventEnd, transferSize: nav.transferSize } : null };
    // Resources summary
    try {
      const res = performance.getEntriesByType ? performance.getEntriesByType('resource') : [];
      diag.resources = { count: res.length, byType: res.reduce((acc,r)=>{ const k = r.initiatorType||'other'; acc[k]=(acc[k]||0)+1; return acc; },{}) };
    } catch(_){}
    // Joystick state
    try { diag.sticks = { left: window.touchControls ? window.touchControls.leftCircle : null, right: window.touchControls ? window.touchControls.rightCircle : null }; } catch(_){}
    // Latest server-side mobile debug payload
    try { const r = await fetch('/mobile-debug', { cache: 'no-store' }); if (r.ok) diag.serverMobileDebug = await r.json(); } catch(_){}
    // Recent logs
    try { diag.logs = (window.__ftd_logBuffer||[]).slice(-200); } catch(_){}
  } catch(err) {
    diag.error = String(err);
  }
  return diag;
}

function setupBuildInfo() {
  const span = document.getElementById('buildTime');
  if (!span) return;
  function updateBuild(){
    fetch('/version', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('bad response')))
      .then(j => { span.textContent = (j && j.build) ? j.build : 'local'; })
      .catch(() => { span.textContent = 'local'; });
  }
  updateBuild();
  setInterval(updateBuild, 60000);
  span.addEventListener('click', () => window.location.reload(true));
}

function setupDebugExportButton() {
  const btn = document.getElementById('debugExportBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      // Signal start
      try { fetch('/mobile-debug', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ event:'debugExportStart', ts: Date.now() }) }).catch(()=>{}); } catch(_){}
      const diag = await gatherMobileDiagnostics();
      const text = [
        `FTD Mobile Debug Export: ${new Date().toISOString()}`,
        `UserAgent: ${diag.userAgent}`,
        `UAData: ${diag.uaData ? JSON.stringify(diag.uaData) : 'n/a'}`,
        `Viewport: ${diag.vw}x${diag.vh} DPR:${diag.dpr}`,
        `VisualViewport: ${diag.visualViewport ? JSON.stringify(diag.visualViewport) : 'n/a'}`,
        `Screen: ${JSON.stringify(diag.screen)}`,
        `Touch: ${JSON.stringify(diag.touch)} Pointer: ${JSON.stringify(diag.pointer)}`,
        `Hardware: ${JSON.stringify(diag.hardware)} Connection: ${JSON.stringify(diag.connection)}`,
        `WebGL: ${JSON.stringify(diag.webgl)}`,
        `Battery: ${JSON.stringify(diag.battery)}`,
        `Permissions: ${JSON.stringify(diag.permissions)}`,
        `Performance: ${JSON.stringify(diag.performance)}`,
        `Resources: ${JSON.stringify(diag.resources)}`,
        `Sticks: ${JSON.stringify(diag.sticks)}`,
        `ServerMobileDebug: ${JSON.stringify(diag.serverMobileDebug)}`,
        `\nRecent Logs:`
      ].join('\n');
      const logs = (diag.logs||[]).map(l => `${new Date(l.t).toISOString()} [${l.level}] ${l.msg}`).join('\n');
      const blob = new Blob([text, '\n', logs], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ftd_mobile_debug_${Date.now()}.txt`;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      // Fallback: also attempt to open in a new tab shortly after (helps some mobile browsers)
      setTimeout(() => {
        try { window.open(url, '_blank'); } catch(_) {}
        try { URL.revokeObjectURL(url); } catch(_) {}
        try { document.body.removeChild(a); } catch(_) {}
      }, 200);
      try { fetch('/mobile-debug', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ event:'debugExportComplete', ts: Date.now(), size: (text.length + logs.length) }) }).catch(()=>{}); } catch(_){}
    } catch (e) {

      try { fetch('/mobile-debug', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ event:'debugExportError', ts: Date.now(), err: String(e) }) }).catch(()=>{}); } catch(_){}
      // Last-resort clipboard copy
      try { await navigator.clipboard.writeText('FTD Debug Export failed to download. Error: '+ String(e)); } catch(_) {}
    }
  });
}

function setupFullscreenButton() {
  const btn = document.getElementById('fullscreenBtn');
  const container = document.getElementById('gameArea');
  if (!btn || !container) return;
  btn.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) await document.mozCancelFullScreen();
        else if (document.msExitFullscreen) await document.msExitFullscreen();
      } else {
        if (container.requestFullscreen) await container.requestFullscreen();
        else if (container.webkitRequestFullscreen) await container.webkitRequestFullscreen();
        else if (container.mozRequestFullScreen) await container.mozRequestFullScreen();
        else if (container.msRequestFullscreen) await container.msRequestFullscreen();
      }
      setTimeout(() => { window.resizeGame(); window.checkOrientation(); }, 150);
    } catch (e) {

    }
  });
}

function wireWindowEvents() {
  window.addEventListener('resize', () => {
    if (window.camera) {
      window.camera.aspect = window.innerWidth / window.innerHeight;
      window.camera.updateProjectionMatrix();
    }
    if (window.renderer) {
      window.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.resizeGame();
    window.checkOrientation();
  });

  window.addEventListener('orientationchange', () => {
    setTimeout(() => { window.resizeGame(); window.checkOrientation(); }, 100);
  });

  if (screen.orientation) {
    screen.orientation.addEventListener('change', () => {
      setTimeout(() => { window.resizeGame(); window.checkOrientation(); }, 100);
    });
  }

  const orientationMediaQuery = window.matchMedia('(orientation: portrait)');
  orientationMediaQuery.addEventListener('change', () => {
    setTimeout(() => { window.resizeGame(); window.checkOrientation(); }, 100);
  });
}

function updateHUD() {
  const integrityBar = document.getElementById('integrityBar');
  const chargeBar = document.getElementById('chargeBar');
  const chargeContainer = document.getElementById('charge');
  const stats = (window.combatSystem && window.combatSystem.combatState) ? window.combatSystem.combatState.playerStats : null;
  if (!stats) return;
  if (integrityBar) {
    integrityBar.style.width = `${(stats.integrity / stats.maxIntegrity) * 100}%`;
    integrityBar.style.backgroundColor = '#00ff00';
  }
  if (chargeBar) {
    chargeBar.style.width = `${(stats.charge / stats.maxCharge) * 100}%`;
    // Change color based on sprinting status
    if (window.isSprinting) {
      chargeBar.style.backgroundColor = '#ff8800'; // Orange when sprinting
      if (chargeContainer) {
        chargeContainer.style.borderColor = '#ff8800';
        chargeContainer.style.borderWidth = '2px';
        chargeContainer.style.boxShadow = '0 0 10px rgba(255, 136, 0, 0.8)';
      }
    } else {
      chargeBar.style.backgroundColor = '#ffff00'; // Yellow normally
      if (chargeContainer) {
        chargeContainer.style.borderColor = '#444';
        chargeContainer.style.borderWidth = '1px';
        chargeContainer.style.boxShadow = '';
      }
    }
  }
}

function showBuildGauge() {
  let gauge = document.getElementById('buildGauge');
  if (!gauge) {
    gauge = document.createElement('div');
    gauge.id = 'buildGauge';
    gauge.style.cssText = 'position:absolute;bottom:60px;left:50%;transform:translateX(-50%);width:200px;height:10px;border:1px solid #00ffff;background:rgba(0,0,0,0.6);z-index:1500';
    const fill = document.createElement('div');
    fill.id = 'buildGaugeFill';
    fill.style.cssText = 'height:100%;width:0;background:#00ffff;';
    gauge.appendChild(fill);
    document.getElementById('hud').appendChild(gauge);
  }
}

function updateBuildGauge(progress, required) {
  const fill = document.getElementById('buildGaugeFill');
  if (!fill) return;
  const pct = Math.max(0, Math.min(1, progress / required));
  fill.style.width = `${Math.round(pct*100)}%`;
  if (pct === 0) {
    const g = document.getElementById('buildGauge');
    g && g.remove();
  }
}

function setupCompass() {
  const gameArea = document.getElementById('gameArea');
  if (!gameArea) return;
  let comp = document.getElementById('hudCompass');
  if (!comp) {
    comp = document.createElement('div');
    comp.id = 'hudCompass';
    comp.innerHTML = `
      <div class="compass-ring">
        <div class="compass-needle"></div>
        <div class="compass-cardinal compass-n">N</div>
        <div class="compass-cardinal compass-e">E</div>
        <div class="compass-cardinal compass-s">S</div>
        <div class="compass-cardinal compass-w">W</div>
        <div class="compass-center"></div>
      </div>
    `;
    gameArea.appendChild(comp);
  }
}

// Compass update throttling
let lastCompassUpdate = 0;
const COMPASS_UPDATE_INTERVAL = 100; // Update every 100ms

function updateCompass() {
  const now = performance.now();
  if (now - lastCompassUpdate < COMPASS_UPDATE_INTERVAL) return;
  lastCompassUpdate = now;
  
  const comp = document.getElementById('hudCompass');
  if (!comp || !window.player) return;
  
  const ring = comp.querySelector('.compass-ring');
  if (!ring) return;
  
  // Clean previous icons
  Array.from(ring.querySelectorAll('.compass-icon')).forEach(n=>n.remove());
  
  // Get camera rotation (0 = north, clockwise)
  const camRot = (typeof window.cameraRotation === 'number') ? window.cameraRotation : 0;
  
  // Rotate the compass ring based on camera rotation
  // Convert from game coordinates to compass rotation (invert and convert to degrees)
  let compassRotation = -(camRot * 180 / Math.PI);
  
  // Store previous rotation to handle wraparound smoothly
  if (!ring.dataset.lastRotation) {
    ring.dataset.lastRotation = compassRotation;
  }
  
  let lastRot = parseFloat(ring.dataset.lastRotation);
  let diff = compassRotation - lastRot;
  
  // Handle wraparound: if difference is too large, we crossed 360/0 boundary
  if (diff > 180) {
    compassRotation -= 360;
  } else if (diff < -180) {
    compassRotation += 360;
  }
  
  ring.dataset.lastRotation = compassRotation;
  ring.style.transform = `rotate(${compassRotation}deg)`;
  
  // Add city icons
  const cities = window.CITIES || [];
  cities.forEach(city => {
    const dx = city.x - window.player.position.x;
    const dz = city.z - window.player.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Skip very distant cities to avoid clutter
    if (distance > 1000) return;
    
    // Calculate bearing from player to city (0 = north, clockwise)
    let bearing = Math.atan2(dx, dz) * 180 / Math.PI;
    if (bearing < 0) bearing += 360;
    
    // Create city icon
    const icon = document.createElement('div');
    icon.className = 'compass-icon city-icon';
    icon.title = `${city.name} (${Math.round(distance)}m)`;
    
    // Get city color
    const style = (window.CITY_STYLES && window.CITY_STYLES[city.name]) ? window.CITY_STYLES[city.name] : { primary: '#00ffff' };
    const col = typeof style.primary === 'number' ? '#' + (style.primary>>>0).toString(16).padStart(6,'0') : (style.primary||'#00ffff');
    icon.style.borderColor = col;
    icon.style.backgroundColor = col + '40'; // Semi-transparent
    
    // Position icon on compass ring (smaller radius for smaller compass)
    const radius = 30; // Distance from center
    const angleRad = bearing * Math.PI / 180;
    const x = Math.sin(angleRad) * radius;
    const y = -Math.cos(angleRad) * radius;
    
    icon.style.left = `calc(50% + ${x}px - 4px)`;
    icon.style.top = `calc(50% + ${y}px - 4px)`;
    
    ring.appendChild(icon);
  });
  
  // Shop icons are now 3D signs in the world, not on compass
}

function setupUI() {
  setupBuildInfo();
  setupDebugExportButton();
  setupFullscreenButton();
  wireWindowEvents();
  setupCompass();
}

// Export
window.setupUI = setupUI;
window.updateHUD = updateHUD;
window.showBuildGauge = showBuildGauge;
window.updateBuildGauge = updateBuildGauge;
window.updateCompass = updateCompass; 