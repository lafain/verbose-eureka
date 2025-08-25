// Mobile touch controls module

const touchControls = {
  leftCircle: { active: false, x: 0, y: 0 }
};
window.touchControls = touchControls;

function setupTouchControls() {
  const left = document.getElementById('leftCircle');
  if (!left) return;

  function setupStick(el, target) {
    let active = false;
    let pointerId = null;
    let lastEvtAt = 0;
    const centerKnob = el.querySelector('.touchCenter');

    function getRelativeFromCoords(x, y) {
      const rect = el.getBoundingClientRect();
      const nx = (x - (rect.left + rect.width / 2)) / (rect.width / 2);
      const ny = (y - (rect.top + rect.height / 2)) / (rect.height / 2);
      const mag = Math.hypot(nx, ny);
      
      // Quantize to 8 directions like keyboard (WASD + diagonals)
      if (mag < 0.2) {
        // Dead zone - no movement
        return { x: 0, y: 0 };
      }
      
      // Calculate angle and snap to nearest 45 degrees
      const angle = Math.atan2(ny, nx);
      const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      
      // Convert back to x,y with magnitude 1 (like keyboard)
      const snapX = Math.cos(snapAngle);
      const snapY = Math.sin(snapAngle);
      
      return { x: snapX, y: snapY };
    }

    function updateKnob(x, y) {
      if (centerKnob) {
        const maxOffset = 30;
        centerKnob.style.transform = `translate(calc(-50% + ${x * maxOffset}px), calc(-50% + ${y * maxOffset}px))`;
      }
    }

    function zeroStick() {
      pointerId = null; active = false; target.active = false; target.x = 0; target.y = 0; updateKnob(0, 0); el.classList.remove('active');
      try { emitMobileDebug && emitMobileDebug({ event: 'stickZero', which: (target===window.touchControls.leftCircle?'left':'right') }); } catch(_){}
    }

    function onDown(e) {
      const isPointer = e.pointerType !== undefined;
      if (isPointer && e.pointerType !== 'touch') return; // ignore mouse/stylus
      const evt = e.touches ? e.touches[0] : e;
      if (pointerId !== null && evt.pointerId !== undefined && evt.pointerId !== pointerId) return;
      pointerId = evt.pointerId !== undefined ? evt.pointerId : 'touch';
      try { if (evt.pointerId !== undefined && el.setPointerCapture) el.setPointerCapture(evt.pointerId); } catch(_){}
      active = true; target.active = true;
      const v = getRelativeFromCoords(evt.clientX, evt.clientY);
      lastEvtAt = Date.now();
      target.x = v.x; target.y = v.y; updateKnob(v.x, v.y);
      el.classList.add('active');
      try { emitMobileDebug && emitMobileDebug({ event: 'stickDown', which: (target===window.touchControls.leftCircle?'left':'right'), x: v.x, y: v.y }); } catch(_){}
      e.preventDefault(); e.stopPropagation();
    }

    function onMove(e) {
      const isPointer = e.pointerType !== undefined;
      if (isPointer && e.pointerType !== 'touch') return;
      const evt = e.touches ? e.touches[0] : e;
      if (!active) return;
      if (evt.pointerId !== undefined && evt.pointerId !== pointerId) return;
      const v = getRelativeFromCoords(evt.clientX, evt.clientY);
      lastEvtAt = Date.now();
      target.x = v.x; target.y = v.y; updateKnob(v.x, v.y);
      try { emitMobileDebug && emitMobileDebug({ event: 'stickMove', which: (target===window.touchControls.leftCircle?'left':'right'), x: v.x, y: v.y }); } catch(_){}
      e.preventDefault(); e.stopPropagation();
    }

    function onUp(e) {
      const isPointer = e && e.pointerType !== undefined;
      if (isPointer && e.pointerType !== 'touch') return;
      const evt = e && (e.changedTouches ? e.changedTouches[0] : e);
      if (!active) return;
      if (evt && evt.pointerId !== undefined && evt.pointerId !== pointerId) return;
      try { if (evt && evt.pointerId !== undefined && el.releasePointerCapture) el.releasePointerCapture(evt.pointerId); } catch(_){}
      zeroStick(); // immediate
      try { emitMobileDebug && emitMobileDebug({ event: 'stickUp', which: (target===window.touchControls.leftCircle?'left':'right') }); } catch(_){}
      if (e) { e.preventDefault(); e.stopPropagation(); }
    }

    // Pointer & touch wiring
    const hasPointer = !!window.PointerEvent;
    if (hasPointer) {
      el.addEventListener('pointerdown', onDown, { passive: false });
      el.addEventListener('pointermove', onMove, { passive: false });
      document.addEventListener('pointerup', onUp, { passive: false });
      document.addEventListener('pointercancel', onUp, { passive: false });
    } else {
      el.addEventListener('touchstart', onDown, { passive: false });
      el.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp, { passive: false });
      document.addEventListener('touchcancel', onUp, { passive: false });
    }
    // Blur/visibility reset
    window.addEventListener('blur', zeroStick);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') zeroStick(); });

    // Removed watchdog timer that was auto-centering the stick
    // The stick should only zero when the user lifts their finger
  }

  setupStick(left, window.touchControls.leftCircle);
}

function preventDefaultTouchBehaviors() {
  document.addEventListener('touchmove', (e) => {
    if (touchControls.leftCircle.active) {
      e.preventDefault();
    }
  }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
}

function wireMobileButtons() {
  // Wire up action button
  const action = document.getElementById('btnAction');
  if (action) {
    action.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Simulate 'F' key press
      const event = new KeyboardEvent('keydown', { key: 'f', code: 'KeyF' });
      window.dispatchEvent(event);
      setTimeout(() => {
        const upEvent = new KeyboardEvent('keyup', { key: 'f', code: 'KeyF' });
        window.dispatchEvent(upEvent);
      }, 100);
    });
  }

  // Wire up build button
  const build = document.getElementById('btnBuild');
  if (build) {
    build.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Simulate 'B' key press
      const event = new KeyboardEvent('keydown', { key: 'b', code: 'KeyB' });
      window.dispatchEvent(event);
      setTimeout(() => {
        const upEvent = new KeyboardEvent('keyup', { key: 'b', code: 'KeyB' });
        window.dispatchEvent(upEvent);
      }, 100);
    });
  }

  // Wire up menu button with both touch and click support
  const menuBtn = document.getElementById('btnMenu');
  if (menuBtn) {
    // Use touchstart for immediate response on mobile
    menuBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Toggle menu
      if (window.menuSystem && window.menuSystem.toggle) {
        window.menuSystem.toggle();
      }
    }, { passive: false });
    
    // Also handle click for desktop/fallback
    menuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Only toggle if not already handled by touchstart
      if (!e.touches && window.menuSystem && window.menuSystem.toggle) {
        window.menuSystem.toggle();
      }
    });
  }

  // Wire up sprint button (toggle style)
  const sprint = document.getElementById('btnSprint');
  if (sprint) {
    let sprintActive = false;
    
    // Handle touch start for sprint
    sprint.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!sprintActive) {
        window.isSprinting = true;
        sprint.classList.add('active');
        sprintActive = true;
      }
    }, { passive: false });
    
    // Handle touch end for sprint
    sprint.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.isSprinting = false;
      sprint.classList.remove('active');
      sprintActive = false;
    }, { passive: false });
    
    // Also handle mouse events for testing
    sprint.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!sprintActive) {
        window.isSprinting = true;
        sprint.classList.add('active');
        sprintActive = true;
      }
    });
    
    sprint.addEventListener('mouseup', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.isSprinting = false;
      sprint.classList.remove('active');
      sprintActive = false;
    });
    
    sprint.addEventListener('mouseleave', (e) => {
      window.isSprinting = false;
      sprint.classList.remove('active');
      sprintActive = false;
    });
  }

  // Wire up camera rotation buttons
  const rotL = document.getElementById('rotateCamLeft');
  const rotR = document.getElementById('rotateCamRight');
  
  if (rotL) {
    rotL.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Rotate camera left
      if (typeof window.cameraRotation === 'number') {
        window.cameraRotation += Math.PI / 8;
        if (window.updateCamera) window.updateCamera();
      }
    });
  }
  
  if (rotR) {
    rotR.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Rotate camera right
      if (typeof window.cameraRotation === 'number') {
        window.cameraRotation -= Math.PI / 8;
        if (window.updateCamera) window.updateCamera();
      }
    });
  }
}

// Remove the old layoutMobileArcButtons function as we don't need arc positioning anymore
// The buttons are now positioned via CSS in a simple vertical layout

// Initialize mobile buttons when touch controls are set up
(function wrapSetup(){
  const original = window.setupTouchControls;
  window.setupTouchControls = function() {
    try { original && original(); } catch (_) {}
    setTimeout(() => { wireMobileButtons(); }, 100);
  };
})();

function emitMobileDebug(payload){
  try {
    const data = {
      ts: Date.now(),
      ua: navigator.userAgent,
      vw: window.innerWidth, vh: window.innerHeight,
      leftRect: (document.getElementById('leftCircle')||{}).getBoundingClientRect?.() || null,
      ...payload
    };
    fetch('/mobile-debug', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(()=>{});
  } catch (_) {}
}

// Heartbeat debug when sticks are active
setInterval(() => {
  try {
    const lc = window.touchControls.leftCircle;
    if ((lc && lc.active)) {
      emitMobileDebug && emitMobileDebug({ event: 'stick', lc: {x: lc.x, y: lc.y, a: lc.active} });
    }
  } catch (_) {}
}, 750);

(function setupMobileDebug(){
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (!isMobile) return;
  // Emit once on load and when resizing/orientation changes
  setTimeout(()=> emitMobileDebug({ event: 'init' }), 300);
  window.addEventListener('resize', ()=> emitMobileDebug({ event: 'resize' }));
  window.addEventListener('orientationchange', ()=> emitMobileDebug({ event: 'orient' }));
})();

window.setupTouchControls = setupTouchControls;
window.preventDefaultTouchBehaviors = preventDefaultTouchBehaviors; 