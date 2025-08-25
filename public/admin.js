const seedInput = document.getElementById('seed');
const flatInput = document.getElementById('flat');
const regenBtn = document.getElementById('regenerate');
const backBtn = document.getElementById('back');

// Load saved values from localStorage on page load
window.addEventListener('DOMContentLoaded', () => {
  seedInput.value = localStorage.getItem('ftd_seed') || '0';
  flatInput.value = localStorage.getItem('ftd_flat') || '1';
  document.getElementById('slope').value = localStorage.getItem('ftd_slope') || '3';
  document.getElementById('border').value = localStorage.getItem('ftd_border') || '3';
  document.getElementById('radius').value = localStorage.getItem('ftd_radius') || '10';
  document.getElementById('base').value = localStorage.getItem('ftd_base') || '0.05';
  document.getElementById('warp').value = localStorage.getItem('ftd_warp') || '0.1';
  document.getElementById('amp').value = localStorage.getItem('ftd_amp') || '5';
  document.getElementById('follow').value = localStorage.getItem('ftd_follow') || '5';
  document.getElementById('outline').checked = localStorage.getItem('ftd_outline') === '1';
});

regenBtn.addEventListener('click', () => {
  const seed = seedInput.value || Date.now();
  const flat = flatInput.value || 1;
  const slope = document.getElementById('slope').value || 3;
  const border = document.getElementById('border').value || 3;
  const outline = document.getElementById('outline').checked ? 1 : 0;
  const radius = document.getElementById('radius').value || 10;

  // New noise + camera params
  const base = document.getElementById('base').value || 0.05;
  const warp = document.getElementById('warp').value || 0.1;
  const amp = document.getElementById('amp').value || 5;
  const follow = document.getElementById('follow').value || 5;

  const map = (window.getCurrentMapId ? window.getCurrentMapId() : (localStorage.getItem('ftd_last_map')||'map1'));
  const url = `/ftd/?map=${map}&seed=${seed}&flat=${flat}&slope=${slope}&border=${border}&radius=${radius}&outline=${outline}&base=${base}&warp=${warp}&amp=${amp}&follow=${follow}`;

  // Persist to localStorage
  localStorage.setItem('ftd_seed', seed);
  localStorage.setItem('ftd_flat', flat);
  localStorage.setItem('ftd_slope', slope);
  localStorage.setItem('ftd_border', border);
  localStorage.setItem('ftd_outline', outline ? 1 : 0);
  localStorage.setItem('ftd_radius', radius);
  localStorage.setItem('ftd_base', base);
  localStorage.setItem('ftd_warp', warp);
  localStorage.setItem('ftd_amp', amp);
  localStorage.setItem('ftd_follow', follow);

  window.location.href = url;
});

backBtn.addEventListener('click', () => {
  window.location.href = '/ftd';
});

// Map server config UI
const mapServersDiv = document.getElementById('mapServers');
if (mapServersDiv) {
  window.addEventListener('DOMContentLoaded', () => {
    try {
      const raw = localStorage.getItem('ftd_mapServers');
      const conf = raw ? JSON.parse(raw) : {};
      mapServersDiv.querySelectorAll('input[data-map]').forEach(inp => {
        const id = inp.getAttribute('data-map');
        if (conf[id]) inp.value = conf[id];
      });
    } catch(_){}
  });
  const saveBtn = document.getElementById('saveMapServers');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const conf = {};
      mapServersDiv.querySelectorAll('input[data-map]').forEach(inp => {
        const id = inp.getAttribute('data-map');
        const v = inp.value.trim();
        if (v) conf[id] = v;
      });
      try { localStorage.setItem('ftd_mapServers', JSON.stringify(conf)); alert('Map servers saved'); } catch (_) { alert('Failed to save'); }
    });
  }
}

// Optional: controls for setting current map
(function(){
  try {
    const cont = document.createElement('div');
    cont.style.marginTop = '10px';
    cont.innerHTML = '<label>Current Map: <select id="adminMapPick"></select></label> <button id="adminGoMap">Open Game</button>';
    document.querySelector('.container').appendChild(cont);
    const sel = document.getElementById('adminMapPick');
    const maps = (window.MAPS) ? Object.values(window.MAPS) : [{ id: 'map1', name: 'Map 1' }];
    const cur = localStorage.getItem('ftd_last_map') || 'map1';
    sel.innerHTML = maps.map(m=>`<option value="${m.id}" ${m.id===cur?'selected':''}>${m.name||m.id}</option>`).join('');
    document.getElementById('adminGoMap').addEventListener('click', ()=>{
      const id = sel.value; localStorage.setItem('ftd_last_map', id);
      window.location.href = `/ftd?map=${id}`;
    });
  } catch(_){}
})(); 