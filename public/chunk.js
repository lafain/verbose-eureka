class Chunk {
  constructor(qOffset, rOffset, chunkSize, scene, createTileMeshFn) {
    console.log(`[CHUNK-CONSTRUCTOR] Creating chunk at Q=${qOffset}, R=${rOffset}, size=${chunkSize}`);
    this.qOffset = qOffset;
    this.rOffset = rOffset;
    this.chunkSize = chunkSize;
    this.group = new THREE.Group();
    scene.add(this.group);
    console.log(`[CHUNK-CONSTRUCTOR] Added group to scene`);

    // generate chunk as merged geometry when utils available; otherwise add individually
    const BGUtils = (window.BufferGeometryUtils && typeof window.BufferGeometryUtils.mergeGeometries === 'function')
      ? window.BufferGeometryUtils
      : (THREE.BufferGeometryUtils && typeof THREE.BufferGeometryUtils.mergeGeometries === 'function'
          ? THREE.BufferGeometryUtils
          : null);

    // Group geometries by material to preserve tile colors
    const geosByMaterial = new Map();
    const lineGeos = [];
    
    let cityTileCount = 0;
    let regularTileCount = 0;
    
    for (let dq = 0; dq < chunkSize; dq++) {
      for (let dr = 0; dr < chunkSize; dr++) {
        const q = qOffset + dq;
        const r = rOffset + dr;
        const { geo, wire } = createTileMeshFn(q, r);
        if (geo) {
          const mat = geo.userData.mat;
          // Check if this is a city tile by checking if it has override data
          // City tiles will have materials from setCityPlateauAndRoads with custom colors
          if (mat && mat.color) {
            const hexColor = mat.color.getHexString();
            // City colors from CITY_STYLES (like 406080, 304050, b0c4de, etc.)
            // These are different from natural terrain colors
            const isNaturalTerrain = (
              hexColor === '0a0a0a' ||  // Deep water
              hexColor === '1a1a1a' ||  // Shallow water  
              hexColor === '2a2a2a' ||  // Shore
              hexColor === '3a3a3a' ||  // Low land
              hexColor === '4a4a4a' ||  // Mid land
              hexColor === '5a5a5a' ||  // High land
              hexColor === '6a6a6a' ||  // Mountain
              hexColor === '7a7a7a'     // Peak
            );
            if (!isNaturalTerrain) {
              cityTileCount++;
            } else {
              regularTileCount++;
            }
          }
          // Group by material color to batch same-colored tiles
          const matKey = mat ? mat.color.getHexString() : 'default';
          if (!geosByMaterial.has(matKey)) {
            geosByMaterial.set(matKey, { material: mat, geometries: [] });
          }
          geosByMaterial.get(matKey).geometries.push(geo);
        }
        if (wire) lineGeos.push(wire);
      }
    }
    
    console.log(`[CHUNK-CONSTRUCTOR] Chunk ${qOffset},${rOffset}: Created ${cityTileCount} city tiles, ${regularTileCount} regular tiles`);

    // Merge geometries by material group
    if (BGUtils && geosByMaterial.size > 0) {
      geosByMaterial.forEach(({ material, geometries }) => {
        if (geometries.length > 0) {
          const merged = BGUtils.mergeGeometries(geometries);
          const mesh = new THREE.Mesh(merged, material || new THREE.MeshStandardMaterial({ color: 0x0a0a0a }));
          this.group.add(mesh);
        }
      });
    } else {
      // fallback: add individual meshes (less efficient but functional)
      geosByMaterial.forEach(({ material, geometries }) => {
        geometries.forEach((g) => {
          const mat = material || new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
          this.group.add(new THREE.Mesh(g, mat));
        });
      });
    }

    if (BGUtils && lineGeos.length) {
      const mergedLines = BGUtils.mergeGeometries(lineGeos);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x0050ff });
      const lines = new THREE.LineSegments(mergedLines, lineMat);
      this.group.add(lines);
    } else if (!BGUtils) {
      lineGeos.forEach((lg) => {
        const lineMat = new THREE.LineBasicMaterial({ color: 0x0050ff });
        this.group.add(new THREE.LineSegments(lg, lineMat));
      });
    }
    
    // Add tile edge lines and red ascent blocking indicators (skip on mobile for performance)
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) {
      this.addTileEdgeLines(qOffset, rOffset, chunkSize);
    }
  }
  
  addTileEdgeLines(qOffset, rOffset, chunkSize) {
    const redLineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
    const blueLineMaterial = new THREE.LineBasicMaterial({ color: 0x88ddff, linewidth: 1 });
    const directions = [
      [1, 0],   // Right
      [0, -1],  // Top
      [-1, 0],  // Left
      [0, 1]    // Bottom
    ];
    
    // Helpers
    const tileSize = 2;
    const axialToCartesian = (q, r, radius) => {
      const x = q * radius;
      const z = r * radius;
      return { x, z };
    };

    const getH = (window.getCityHeight || window.getHeight || (() => 0));
    const overrides = (window.CITY_TILE_OVERRIDES || new Map());
    
    for (let dq = 0; dq < chunkSize; dq++) {
      for (let dr = 0; dr < chunkSize; dr++) {
        const q = qOffset + dq;
        const r = rOffset + dr;

        // Skip all edge highlights for city tiles
        if (overrides.has(`${q},${r}`)) {
          continue;
        }

        let curH = getH(q, r);
        if (!Number.isFinite(curH)) curH = 0;
        const { x, z } = axialToCartesian(q, r, tileSize);
        
        directions.forEach(([dirQ, dirR], index) => {
          const nQ = q + dirQ;
          const nR = r + dirR;

          // Skip edges into city tiles
          if (overrides.has(`${nQ},${nR}`)) return;

          let nH = getH(nQ, nR);
          if (!Number.isFinite(nH)) nH = curH;
          const heightDiff = nH - curH;
          
          // Calculate edge geometry
          const { x: nX, z: nZ } = axialToCartesian(nQ, nR, tileSize);
          const edgeMidX = (x + nX) / 2;
          const edgeMidZ = (z + nZ) / 2;
          const dirToNeighbor = Math.atan2(nZ - z, nX - x);
          const edgeDirection = dirToNeighbor + Math.PI / 2;
          const edgeLength = tileSize * 0.95;
          
          const edgeStartX = edgeMidX + Math.cos(edgeDirection) * edgeLength * 0.5;
          const edgeStartZ = edgeMidZ + Math.sin(edgeDirection) * edgeLength * 0.5;
          const edgeEndX = edgeMidX - Math.cos(edgeDirection) * edgeLength * 0.5;
          const edgeEndZ = edgeMidZ - Math.sin(edgeDirection) * edgeLength * 0.5;
          
          // Draw ascent blocked red lines and normal edge highlights only for non-city edges
          if (heightDiff > 1.01) {
            const lineGeo = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(edgeStartX, curH + 0.05, edgeStartZ),
              new THREE.Vector3(edgeEndX, curH + 0.05, edgeEndZ)
            ]);
            const redLine = new THREE.Line(lineGeo, redLineMaterial);
            this.group.add(redLine);
          } else {
            const lineGeo = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(edgeStartX, curH + 0.02, edgeStartZ),
              new THREE.Vector3(edgeEndX, curH + 0.02, edgeEndZ)
            ]);
            const blueLine = new THREE.Line(lineGeo, blueLineMaterial);
            this.group.add(blueLine);
          }
        });
      }
    }
  }
}

// expose globally
window.FTD_Chunk = Chunk; 