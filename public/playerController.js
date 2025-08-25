// Player movement and control system

let movementDirection = { x: 0, z: 0 };
let facingDirection = 0;
let keys = {};

// Simple jump system preserving horizontal movement
let __jumping = false;
let __jumpVy = 0;
let __lastGroundY = null;
let __bobPhase = 0;
let __bobBaseY = null;

const JUMP_SPEED = 0.18; // upward units per ms baseline
const GRAVITY = 0.0007;  // downward units per ms^2 baseline

window.movementDirection = movementDirection;
window.facingDirection = facingDirection;
window.keys = keys;

// Sprint state
window.isSprinting = false;

function isGrounded() {
  try {
    const player = window.player;
    if (!player) return false;
    const h = window.sampleGroundHeightAt(player.position.x, player.position.z);
    if (!Number.isFinite(h)) return false;
    return Math.abs(player.position.y - Math.max(h + window.PLAYER_Y_OFFSET, 1.0)) < 0.02;
  } catch(_) { 
    return false; 
  }
}

function startJump() {
  const player = window.player;
  if (!player) return;
  if (__jumping) return;
  if (!isGrounded()) return;
  
  // set jump
  const ground = window.sampleGroundHeightAt(player.position.x, player.position.z) || 0;
  __lastGroundY = Math.max(ground + window.PLAYER_Y_OFFSET, 1.0);
  __jumping = true;
  __jumpVy = JUMP_SPEED; // initial upward velocity
}
window.startJump = startJump;

// Snap player Y to current terrain height (uses city overrides if present)
function snapPlayerToGround() {
  try {
    const player = window.player;
    if (!player) return;
    const h = window.sampleGroundHeightAt(player.position.x, player.position.z);
    if (Number.isFinite(h)) {
      const y = Math.max(h + window.PLAYER_Y_OFFSET, 1.0);
      player.position.y = y;
      __bobBaseY = y;
      __lastGroundY = y;
      updateCamera();
    }
  } catch(_) {}
}
window.snapPlayerToGround = snapPlayerToGround;

function updatePlayerMovement(deltaTime) {
  if (window.__introInputLock) { return; } // Don't render here - let animate() handle it
  
  const player = window.player;
  const camera = window.camera;
  if (!player) return;
  
  let inputX = 0, inputZ = 0;
  const prevPos = player.position.clone();
  
  // Keyboard input
  if (keys['KeyW']) inputZ -= 1; 
  if (keys['KeyS']) inputZ += 1; 
  if (keys['KeyA']) inputX -= 1; 
  if (keys['KeyD']) inputX += 1;
  
  // Touch controls input
  if (window.touchControls && window.touchControls.leftCircle && window.touchControls.leftCircle.active) {
    const lc = window.touchControls.leftCircle;
    inputX = lc.x; 
    inputZ = lc.y;
  }
  
  // Rotate input based on camera rotation
  const cosRot = Math.cos(-window.cameraRotation); 
  const sinRot = Math.sin(-window.cameraRotation);
  movementDirection.x = inputX * cosRot - inputZ * sinRot;
  movementDirection.z = inputX * sinRot + inputZ * cosRot;
  
  // Arrow key facing
  let arrowX = 0, arrowZ = 0;
  if (keys['ArrowUp']) arrowZ = -1; 
  if (keys['ArrowDown']) arrowZ = 1; 
  if (keys['ArrowLeft']) arrowX = -1; 
  if (keys['ArrowRight']) arrowX = 1;
  
  if (arrowX !== 0 || arrowZ !== 0) {
    const rotatedArrowX = arrowX * cosRot - arrowZ * sinRot;
    const rotatedArrowZ = arrowX * sinRot + arrowZ * cosRot;
    facingDirection = Math.atan2(rotatedArrowX, rotatedArrowZ);
  }

  // Normalize movement
  const moveMag = Math.hypot(movementDirection.x, movementDirection.z);
  if (moveMag > 0) { 
    movementDirection.x /= moveMag; 
    movementDirection.z /= moveMag; 
  }
  
  // Calculate speed multiplier based on facing
  let speedMultiplier = 1.0;
  if (moveMag > 0) {
    const movementAngle = Math.atan2(movementDirection.x, movementDirection.z);
    let angleDiff = Math.abs(movementAngle - facingDirection);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    const alignmentFactor = Math.cos(angleDiff);
    speedMultiplier = 0.25 + 0.75 * ((alignmentFactor + 1) / 2);
  }
  
  // Face selected enemy if any; otherwise align facing to movement when moving
  const hasTarget = !!(window.selectedEnemy && window.selectedEnemy.alive);
  if (hasTarget) {
    const tp = window.selectedEnemy.mesh.position;
    const dx = tp.x - player.position.x;
    const dz = tp.z - player.position.z;
    facingDirection = Math.atan2(dx, dz);
  } else if (moveMag > 0) {
    const movementAngle = Math.atan2(movementDirection.x, movementDirection.z);
    facingDirection = movementAngle;
    speedMultiplier = Math.max(speedMultiplier, 1.1);
  }
  
  // Apply rotation so local player visually faces current aim direction
  try { 
    if (player) player.rotation.z = facingDirection + Math.PI; 
  } catch(_){}
  
  // Calculate movement
  const baseSpeed = 0.1; 
  const sprintMultiplier = window.isSprinting ? 2.0 : 1.0; // Double speed when sprinting
  const effectiveSpeed = baseSpeed * speedMultiplier * sprintMultiplier * (window.__speedBoost || 1);
  const dx = movementDirection.x * effectiveSpeed * deltaTime * 0.06;
  const dz = movementDirection.z * effectiveSpeed * deltaTime * 0.06;
  const newX = player.position.x + dx; 
  const newZ = player.position.z + dz;
  
  // Height-based movement blocking
  const { q: curQ, r: curR } = window.cartesianToAxial(player.position.x, player.position.z, window.tileSize);
  const { q: tgtQ, r: tgtR } = window.cartesianToAxial(newX, newZ, window.tileSize);
  let curH = window.getCityHeight(curQ, curR); 
  if (!Number.isFinite(curH)) curH = window.getHeight(curQ, curR);
  let tgtH = window.getCityHeight(tgtQ, tgtR); 
  if (!Number.isFinite(tgtH)) tgtH = window.getHeight(tgtQ, tgtR);
  const heightDiff = tgtH - curH;
  const canMove = (heightDiff <= 0) || (heightDiff <= 1.01);
  
  if (canMove) {
    player.position.x = newX; 
    player.position.z = newZ; // Y handled below (jump/ground)
  } else {
    // Slide along walls
    const testX = player.position.x + dx; 
    const testZ = player.position.z + dz;
    const { q: testXQ, r: testXR } = window.cartesianToAxial(testX, player.position.z, window.tileSize);
    const { q: testZQ, r: testZR } = window.cartesianToAxial(player.position.x, testZ, window.tileSize);
    let testXH = window.getCityHeight(testXQ, testXR); 
    if (!Number.isFinite(testXH)) testXH = window.getHeight(testXQ, testXR);
    let testZH = window.getCityHeight(testZQ, testZR); 
    if (!Number.isFinite(testZH)) testZH = window.getHeight(testZQ, testZR);
    const canMoveX = (testXH - curH <= 0) || (testXH - curH <= 1.01);
    const canMoveZ = (testZH - curH <= 0) || (testZH - curH <= 1.01);
    
    let slideX = 0, slideZ = 0;
    if (canMoveX && !canMoveZ) slideX = dx * 0.75; 
    else if (canMoveZ && !canMoveX) slideZ = dz * 0.75;
    
    if (slideX || slideZ) {
      const finalX = player.position.x + slideX; 
      const finalZ = player.position.z + slideZ;
      player.position.x = finalX; 
      player.position.z = finalZ;
    }
  }

  // Jump/gravity integration
  try {
    const groundH = window.sampleGroundHeightAt(player.position.x, player.position.z);
    const groundY = Number.isFinite(groundH) ? Math.max(groundH + window.PLAYER_Y_OFFSET, 1.0) : (player.position.y - 0.02);
    
    if (__jumping) {
      // apply velocity
      player.position.y += __jumpVy * deltaTime;
      __jumpVy -= GRAVITY * deltaTime; // gravity downwards
      if (player.position.y <= groundY) {
        player.position.y = groundY;
        __jumping = false;
        __jumpVy = 0;
        __lastGroundY = groundY;
      }
    } else {
      // stick to ground smoothly
      player.position.y = THREE.MathUtils.lerp(player.position.y, groundY, 0.45);
      __lastGroundY = groundY;
      // Update bobBaseY to match the actual ground position
      __bobBaseY = groundY;
    }
  } catch(_) {}

  // Update shadow
  try {
    const playerShadow = window.playerShadow;
    if (playerShadow) {
      const gh = window.sampleGroundHeightAt(player.position.x, player.position.z);
      const y = Number.isFinite(gh) ? gh + 0.02 : player.position.y - 0.5;
      const scale = 0.8 + Math.min(0.6, Math.abs((player.position.y - y) * 0.3));
      playerShadow.scale.set(scale, scale, 1);
      playerShadow.position.set(player.position.x, y, player.position.z);
    }
  } catch(_) {}
  
  updateCamera();
  
  // Update chunks
  const { q: pQ, r: pR } = window.cartesianToAxial(player.position.x, player.position.z, window.tileSize);
  if (window.updateChunks) window.updateChunks(pQ, pR);
  
  // Tree collision pushback
  try { 
    if (window.plantSystem && window.plantSystem.blockTrees) window.plantSystem.blockTrees(prevPos); 
  } catch(_){}
  
  // Network sync
  const now = Date.now();
  if (window.socket && (!window.lastMovementUpdate || now - window.lastMovementUpdate > 50)) {
    window.socket.emit('playerMove', { 
      x: player.position.x, 
      y: player.position.y, 
      z: player.position.z, 
      rotation: player.rotation.z 
    });
    window.lastMovementUpdate = now;
  }
  
  // Update bob phase
  __bobPhase += deltaTime * 0.004;
  window.__bobPhase = __bobPhase;
  window.__bobBaseY = __bobBaseY;
}
window.updatePlayerMovement = updatePlayerMovement;

// Apply bobbing effect
function applyPlayerBobbing() {
  try {
    const player = window.player;
    if (player && !__jumping && __bobBaseY !== null && __bobBaseY > 0) {
      const bobOffset = Math.sin(__bobPhase) * 0.03;
      player.position.y = __bobBaseY + bobOffset;
    }
  } catch(_){ }
}
window.applyPlayerBobbing = applyPlayerBobbing;

function updateCamera() {
  const camera = window.camera;
  const player = window.player;
  if (!camera || !player) return;
  
  const desiredCamPos = player.position.clone().add(window.cameraOffset);
  const horizDist = Math.hypot(camera.position.x - desiredCamPos.x, camera.position.z - desiredCamPos.z);
  const deadZoneOvershoot = Math.max(0, horizDist - parseFloat(window.paramValue('follow', 5)));
  const followSpeed = deadZoneOvershoot > 0 ? (deadZoneOvershoot * 0.02 + 0.02) : 0;
  
  if (deadZoneOvershoot > 0) {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, desiredCamPos.x, followSpeed);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, desiredCamPos.z, followSpeed);
  }
  
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, desiredCamPos.y, 0.1);
  
  const lookTarget = new THREE.Vector3(
    camera.position.x - Math.sin(window.cameraRotation) * window.cameraDistance,
    player.position.y,
    camera.position.z - Math.cos(window.cameraRotation) * window.cameraDistance
  );
  camera.lookAt(lookTarget);
}
window.updateCamera = updateCamera;

// Input handlers
window.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') return;
  keys[e.code] = true;
  
  if (!window.isMobileDevice()) {
    if (e.code === 'KeyQ') window.rotateLeftActive = true;
    if (e.code === 'KeyE') window.rotateRightActive = true;
  }
  
  // Sprint on Shift (hold to run)
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    window.isSprinting = true;
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'Tab') return;
  keys[e.code] = false;
  
  if (!window.isMobileDevice()) {
    if (e.code === 'KeyQ') window.rotateLeftActive = false;
    if (e.code === 'KeyE') window.rotateRightActive = false;
  }
  
  // Stop sprinting when Shift released
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    window.isSprinting = false;
  }
});

