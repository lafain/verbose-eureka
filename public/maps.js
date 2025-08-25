(function(){
  const MAPS = {
    map1: {
      id: 'map1', name: 'Prime Grid',
      cities: [
        { name: 'Nexus Prime', x: -650, z: -900, radius: 140, primary: true },
        { name: 'Data Spire', x: 900, z: -500, radius: 110 },
        { name: 'Core Hub', x: -200, z: 1300, radius: 120 }
      ],
      styles: {
        'Nexus Prime': { primary: 0x406080, secondary: 0x304050, accent: 0xb0c4de },
        'Data Spire':  { primary: 0x804040, secondary: 0x503030, accent: 0xd8bFD8 },
        'Core Hub':    { primary: 0x407040, secondary: 0x305030, accent: 0xedc9af }
      }
    },
    map2: {
      id: 'map2', name: 'Ionis Basin',
      cities: [
        { name: 'Ionis Gate', x: -1200, z: 300, radius: 130, primary: true },
        { name: 'Neon Harbor', x: 600, z: -1100, radius: 115 },
        { name: 'Quartz Reach', x: 1100, z: 900, radius: 105 }
      ],
      styles: {
        'Ionis Gate':   { primary: 0x224466, secondary: 0x112233, accent: 0x66ccff },
        'Neon Harbor':  { primary: 0x222244, secondary: 0x111133, accent: 0xaa66ff },
        'Quartz Reach': { primary: 0x666644, secondary: 0x333322, accent: 0xead9a6 }
      }
    },
    map3: {
      id: 'map3', name: 'Aurora Steppe',
      cities: [
        { name: 'Aurora City', x: 200, z: -1400, radius: 125, primary: true },
        { name: 'Echo Verge', x: -1100, z: 1000, radius: 115 },
        { name: 'Flux Ridge', x: 1300, z: 400, radius: 110 }
      ],
      styles: {
        'Aurora City': { primary: 0x445577, secondary: 0x223344, accent: 0x88aaff },
        'Echo Verge':  { primary: 0x335544, secondary: 0x224433, accent: 0x99ffcc },
        'Flux Ridge':  { primary: 0x774444, secondary: 0x553333, accent: 0xff9999 }
      }
    },
    map4: {
      id: 'map4', name: 'Obsidian Array',
      cities: [
        { name: 'Obsidian Fold', x: -1300, z: -1000, radius: 135, primary: true },
        { name: 'Sapphire Node', x: 1200, z: -200, radius: 115 },
        { name: 'Crimson Lattice', x: -200, z: 1200, radius: 110 }
      ],
      styles: {
        'Obsidian Fold':   { primary: 0x333333, secondary: 0x1e1e1e, accent: 0x777777 },
        'Sapphire Node':   { primary: 0x224466, secondary: 0x1a3350, accent: 0x3399ff },
        'Crimson Lattice': { primary: 0x662222, secondary: 0x401111, accent: 0xff3366 }
      }
    },
    map5: {
      id: 'map5', name: 'Cinder Reach',
      cities: [
        { name: 'Cinder Sprawl', x: -300, z: -1200, radius: 120, primary: true },
        { name: 'Glacier Array', x: 900, z: 1100, radius: 120 },
        { name: 'Verdant Loom', x: -1200, z: 400, radius: 115 }
      ],
      styles: {
        'Cinder Sprawl': { primary: 0x553311, secondary: 0x332208, accent: 0xffaa66 },
        'Glacier Array': { primary: 0x99bbcc, secondary: 0x557788, accent: 0xccffff },
        'Verdant Loom':  { primary: 0x225533, secondary: 0x173a24, accent: 0x66ffaa }
      }
    },
    map6: {
      id: 'map6', name: 'Crown Expanse',
      cities: [
        { name: 'Violet Crown', x: 1200, z: 200, radius: 125, primary: true },
        { name: 'Amber Bastion', x: -900, z: -900, radius: 115 },
        { name: 'Cerulean Span', x: -100, z: 1200, radius: 110 }
      ],
      styles: {
        'Violet Crown':  { primary: 0x663388, secondary: 0x3a1f4d, accent: 0xcc88ff },
        'Amber Bastion': { primary: 0xaa7722, secondary: 0x6f4e17, accent: 0xffdd88 },
        'Cerulean Span': { primary: 0x2277aa, secondary: 0x1a587f, accent: 0x88ddff }
      }
    }
  };

  function getCurrentMapId(){
    try {
      const urlMap = (typeof window.paramValue === 'function') ? window.paramValue('map', null) : null;
      const last = localStorage.getItem('ftd_last_map') || 'map1';
      return String(urlMap || last || 'map1');
    } catch (_) { return 'map1'; }
  }

  function applyMapDefinition(){
    const id = getCurrentMapId();
    const def = MAPS[id] || MAPS.map1;
    try { localStorage.setItem('ftd_last_map', def.id); } catch(_){}
    window.CITIES = def.cities.map(c => ({ ...c }));
    window.CITY_STYLES = { ...def.styles };
    window.MAP_DEF = def;
  }

  function getSocketUrlForMap(mapId){
    try {
      const raw = localStorage.getItem('ftd_mapServers');
      if (!raw) return '';
      const conf = JSON.parse(raw);
      const v = conf && conf[mapId];
      if (typeof v === 'string' && v.trim()) return v.trim();
      return '';
    } catch (_) { return ''; }
  }

  // Expose
  window.MAPS = MAPS;
  window.getCurrentMapId = getCurrentMapId;
  window.applyMapDefinition = applyMapDefinition;
  window.getSocketUrlForMap = getSocketUrlForMap;
})(); 