// Bootstrap: initialize game after document loads

window.addEventListener('load', () => {
  // Test debug output
  console.log('=== BOOTSTRAP STARTING - DEBUG TEST ===');
  
  // If not logged in, redirect to landing
  if (!localStorage.getItem('ftd_player')) {
    window.location.href = '/';
    return;
  }

  // Initialize UI and core systems
  if (typeof window.setupUI === 'function') window.setupUI();

  // Apply selected map definition (CITIES, styles) before overrides/cities generation

  if (typeof window.applyMapDefinition === 'function') window.applyMapDefinition();

  // Prepare city overrides BEFORE game init so chunks build with city tiles for the cinematic

  if (typeof window.prepareCityOverrides === 'function') {
    window.prepareCityOverrides();
  }

  // Initialize game (scene, camera, player, chunks, multiplayer)

  if (typeof window.initGame === 'function') window.initGame();
  
  // Generate decorative meshes BEFORE intro starts

  if (typeof window.generateCities === 'function') {
    window.generateCities();
    // Don't refresh chunks here - let the intro handle chunk loading
  }


  // Spawn city citizens
  try { if (window.citizenSystem && window.citizenSystem.initCitizens) window.citizenSystem.initCitizens(); } catch(_){}

  // Session monitoring for mobile
  if (window.isMobileDevice && window.isMobileDevice()) {
    let isAppActive = true;
    const handleAppBackground = () => { isAppActive = false; if (window.socket && window.socket.disconnect) { try { window.socket.disconnect(); } catch (_) {} } };
    const handleAppForeground = () => { isAppActive = true; };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handleAppBackground(); else if (document.visibilityState === 'visible') handleAppForeground();
    });
    window.addEventListener('blur', handleAppBackground);
    window.addEventListener('focus', handleAppForeground);
    window.addEventListener('pagehide', handleAppBackground);
    window.addEventListener('pageshow', handleAppForeground);
    setInterval(() => { if (isAppActive && window.isMobileDevice()) { if (!document.hasFocus() && document.visibilityState === 'hidden') handleAppBackground(); } }, 5000);
  }

  // Start Level 2 combat only after intro completes (if any)
  const scheduleCombatInit = () => {
    if (window.__introRunning) { setTimeout(scheduleCombatInit, 300); return; }
    if (window.combatSystem && window.combatSystem.initCombat && window.scene && window.player && window.camera) {
      window.combatSystem.initCombat(window.scene, window.player, window.camera);
      // Note: Keydown handlers are now consolidated in gameInit.js to prevent conflicts
    }
  };
  setTimeout(scheduleCombatInit, 1000);
}); 