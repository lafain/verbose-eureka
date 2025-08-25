// Camera controls and shared camera variables

// Global camera state (use window to share across modules)
window.cameraRotation = (typeof window.cameraRotation === 'number') ? window.cameraRotation : Math.PI / 4; // 45 degrees
window.cameraHeight = (typeof window.cameraHeight === 'number') ? window.cameraHeight : 20;
window.cameraDistance = (typeof window.cameraDistance === 'number') ? window.cameraDistance : 10;
window.cameraOffset = window.cameraOffset || new THREE.Vector3(
  Math.sin(window.cameraRotation) * window.cameraDistance,
  window.cameraHeight,
  Math.cos(window.cameraRotation) * window.cameraDistance
);

// Smooth camera rotation controls
const CAMERA_ROTATION_SPEED = 1.2; // radians per second
const CAMERA_ROTATION_STEP = 0.1;  // radians per tap
window.rotateLeftActive = false;
window.rotateRightActive = false;

// Update camera offset based on current rotation
function updateCameraOffset() {
  window.cameraOffset.x = Math.sin(window.cameraRotation) * window.cameraDistance;
  window.cameraOffset.z = Math.cos(window.cameraRotation) * window.cameraDistance;
}

// Setup camera rotation buttons for mobile and clicks for desktop
function setupCameraRotation() {
  const leftBtn = document.getElementById('rotateCamLeft');
  const rightBtn = document.getElementById('rotateCamRight');

  const startLeft = () => { window.rotateLeftActive = true; };
  const stopLeft = () => { window.rotateLeftActive = false; };
  const startRight = () => { window.rotateRightActive = true; };
  const stopRight = () => { window.rotateRightActive = false; };

  if (leftBtn) {
    leftBtn.addEventListener('mousedown', startLeft);
    leftBtn.addEventListener('mouseup', stopLeft);
    leftBtn.addEventListener('mouseleave', stopLeft);
    leftBtn.addEventListener('touchstart', startLeft, { passive: true });
    leftBtn.addEventListener('touchend', stopLeft);
    leftBtn.addEventListener('touchcancel', stopLeft);
    leftBtn.addEventListener('click', () => {
      window.cameraRotation -= CAMERA_ROTATION_STEP;
      if (window.cameraRotation < 0) window.cameraRotation += Math.PI * 2;
      updateCameraOffset();
      // Removed forced reloadVisibleChunks; rely on frustum-based visibility
    });
  }

  if (rightBtn) {
    rightBtn.addEventListener('mousedown', startRight);
    rightBtn.addEventListener('mouseup', stopRight);
    rightBtn.addEventListener('mouseleave', stopRight);
    rightBtn.addEventListener('touchstart', startRight, { passive: true });
    rightBtn.addEventListener('touchend', stopRight);
    rightBtn.addEventListener('touchcancel', stopRight);
    rightBtn.addEventListener('click', () => {
      window.cameraRotation += CAMERA_ROTATION_STEP;
      if (window.cameraRotation > Math.PI * 2) window.cameraRotation -= Math.PI * 2;
      updateCameraOffset();
      // Removed forced reloadVisibleChunks; rely on frustum-based visibility
    });
  }
}

// Expose for other modules
window.CAMERA_ROTATION_SPEED = CAMERA_ROTATION_SPEED;
window.CAMERA_ROTATION_STEP = CAMERA_ROTATION_STEP;
window.updateCameraOffset = updateCameraOffset;
window.setupCameraRotation = setupCameraRotation; 