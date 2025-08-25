// Common utility functions shared across client modules

// URL param handling with localStorage fallback
const urlParams = new URLSearchParams(window.location.search);
function paramValue(name, fallback) {
  const param = urlParams.get(name);
  if (param !== null) {
    localStorage.setItem(`ftd_${name}`, param);
    return param;
  }
  const stored = localStorage.getItem(`ftd_${name}`);
  if (stored !== null) return stored;
  return fallback;
}

// Guest detection helpers
function isGuestName(name) {
  try { return /^guest[-_]/i.test(String(name || '')); } catch (_) { return false; }
}
function isGuestUser() {
  try {
    const flag = localStorage.getItem('ftd_is_guest');
    if (flag === '1') return true;
    if (flag === '0') return false;
  } catch (_) {}
  try {
    const nm = localStorage.getItem('ftd_player');
    return isGuestName(nm);
  } catch (_) { return true; }
}

// Mobile detection with caching
let cachedMobileResult = null;
let lastMobileCheck = 0;
const MOBILE_CHECK_CACHE_DURATION = 5000;
function isMobileDevice() {
  const now = Date.now();
  if (cachedMobileResult !== null && (now - lastMobileCheck) < MOBILE_CHECK_CACHE_DURATION) {
    return cachedMobileResult;
  }
  const userAgentCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTouchPrimary = 'ontouchstart' in window && navigator.maxTouchPoints > 0;
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const hasNoHover = window.matchMedia('(hover: none)').matches;
  const verySmallScreen = window.innerWidth <= 480;
  const touchMobileCheck = isTouchPrimary && hasCoarsePointer && hasNoHover;
  const isMobile = userAgentCheck || touchMobileCheck || (verySmallScreen && isTouchPrimary);
  cachedMobileResult = isMobile;
  lastMobileCheck = now;
  return isMobile;
}

// Orientation checks
let lastOrientationCheck = 0;
const ORIENTATION_CHECK_THROTTLE = 250;
function isPortrait() {
  return window.innerHeight > window.innerWidth;
}
function checkOrientation() {
  const now = Date.now();
  if (now - lastOrientationCheck < ORIENTATION_CHECK_THROTTLE) return;
  lastOrientationCheck = now;
  const orientationMessage = document.getElementById('orientationMessage');
  const gameAreaElement = document.getElementById('gameArea');
  if (!orientationMessage || !gameAreaElement) return;
  const mobile = isMobileDevice();
  const portrait = isPortrait();
  if (mobile && portrait) {
    orientationMessage.style.display = 'flex';
    orientationMessage.style.zIndex = '10001';
    gameAreaElement.style.display = 'none';
  } else {
    orientationMessage.style.display = 'none';
    gameAreaElement.style.display = 'block';
  }
}

// Grid/axial helpers for square tiles
function gridToCartesian(x, y, tileSize) {
  return { x: x * tileSize, z: y * tileSize };
}
function cartesianToGrid(x, z, tileSize) {
  return { x: Math.round(x / tileSize), y: Math.round(z / tileSize) };
}
function axialToCartesian(q, r, radius) {
  return gridToCartesian(q, r, radius);
}
function cartesianToAxial(x, z, tileSize) {
  const grid = cartesianToGrid(x, z, tileSize);
  return { q: grid.x, r: grid.y };
}

// Resize game area to maintain aspect ratio (16:9) unless mobile fullscreen
const GAME_ASPECT_RATIO = 16 / 9;
const GAME_BASE_WIDTH = 1920;
function resizeGame() {
  const gameArea = document.getElementById('gameArea');
  if (!gameArea) return;
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;
  const newWidthToHeight = newWidth / newHeight;
  let gameWidth, gameHeight;
  const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
  if (isFullscreen || (window.innerWidth <= 768 && !isPortrait())) {
    gameWidth = newWidth; gameHeight = newHeight;
  } else if (newWidthToHeight > GAME_ASPECT_RATIO) {
    gameHeight = newHeight; gameWidth = gameHeight * GAME_ASPECT_RATIO;
  } else {
    gameWidth = newWidth; gameHeight = gameWidth / GAME_ASPECT_RATIO;
  }
  gameArea.style.width = gameWidth + 'px';
  gameArea.style.height = gameHeight + 'px';
  if (isFullscreen || (window.innerWidth <= 768 && !isPortrait())) {
    gameArea.style.marginLeft = '0';
    gameArea.style.marginTop = '0';
    gameArea.style.left = '0';
    gameArea.style.top = '0';
  } else {
    gameArea.style.marginLeft = (-gameWidth / 2) + 'px';
    gameArea.style.marginTop = (-gameHeight / 2) + 'px';
    gameArea.style.left = '50%';
    gameArea.style.top = '50%';
  }
  if (window.renderer) window.renderer.setSize(gameWidth, gameHeight);
  if (window.camera) {
    window.camera.aspect = gameWidth / gameHeight;
    window.camera.updateProjectionMatrix();
  }
  gameArea.style.fontSize = (gameWidth / GAME_BASE_WIDTH) + 'em';
}

// Export
window.paramValue = paramValue;
window.isGuestName = isGuestName;
window.isGuestUser = isGuestUser;
window.isMobileDevice = isMobileDevice;
window.isPortrait = isPortrait;
window.checkOrientation = checkOrientation;
window.gridToCartesian = gridToCartesian;
window.cartesianToGrid = cartesianToGrid;
window.axialToCartesian = axialToCartesian;
window.cartesianToAxial = cartesianToAxial;
window.resizeGame = resizeGame;
window.GAME_ASPECT_RATIO = GAME_ASPECT_RATIO;
window.GAME_BASE_WIDTH = GAME_BASE_WIDTH;
// Convenience flag used by menu system at bootstrap time
window.isMobile = isMobileDevice(); 