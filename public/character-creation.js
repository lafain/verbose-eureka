const characterForm = document.getElementById('characterForm');
const characterName = document.getElementById('characterName');
const characterClass = document.getElementById('characterClass');
const characterColor = document.getElementById('characterColor');
const classDescription = document.getElementById('classDescription');
const backBtn = document.getElementById('backBtn');
const colorPresets = document.querySelectorAll('.color-preset');

// Class descriptions matching the skill trees from menu.js
const classDescriptions = {
  predator: {
    name: 'Predator',
    color: '#ff6666',
    description: 'A combat-focused class specializing in high damage output and mobility. Predators excel at quick strikes and hit-and-run tactics.\n\nAbilities:\n• Fleet-Footed: +10% Move Speed\n• Bloodlust: +10% Weapon Damage\n• Pounce: Enhanced movement control\n• Frenzy: Stacking damage bonuses\n• Alpha Predator: Ultimate combat mastery'
  },
  sentinel: {
    name: 'Sentinel',
    color: '#66ccff',
    description: 'A defensive tank class built for survival and protection. Sentinels can withstand massive damage while supporting their team.\n\nAbilities:\n• Plating: Take 10% less damage\n• Bulwark: +10 Max Integrity\n• Hardening: Stacking damage reduction\n• Capacitors: +10 Max Charge\n• Aegis: Ultimate defensive mastery'
  },
  artificer: {
    name: 'Artificer',
    color: '#ffaa33',
    description: 'A builder specialist focused on construction and automation. Artificers excel at creating powerful defensive structures.\n\nAbilities:\n• Grease the Gears: Synthesizer +1 yield\n• Calipers: Turrets +10% damage\n• Assembly Line: Enhanced synthesis\n• Precision Barrels: Improved turret performance\n• Factory Mind: Ultimate construction mastery'
  },
  arcanist: {
    name: 'Arcanist',
    color: '#bb66ff',
    description: 'An energy master who manipulates charge and power systems. Arcanists can sustain prolonged combat through superior energy management.\n\nAbilities:\n• Conductor: +0.5/s passive Charge regen\n• Efficiency: Weapons cost -10% charge\n• Overflow: Enhanced charge regeneration\n• Tuning: Improved energy efficiency\n• Singularity: Ultimate energy mastery'
  },
  ranger: {
    name: 'Ranger',
    color: '#66ff99',
    description: 'A precision fighter specializing in ranged combat and accuracy. Rangers excel at long-distance engagements and tactical positioning.\n\nAbilities:\n• Stability: +10% weapon accuracy\n• Quick Draw: +10% projectile speed/range\n• Focus: Enhanced accuracy\n• Fletching: Improved projectile performance\n• Hawkeye: Ultimate precision mastery'
  },
  saboteur: {
    name: 'Saboteur',
    color: '#cccc66',
    description: 'A support specialist focused on utility structures and team enhancement. Saboteurs provide crucial battlefield support.\n\nAbilities:\n• Insulation: Conduit +0.5/s regen radius +1\n• Overcharged: Enhanced conduit regeneration\n• Field Tuning: Shield radius +2\n• Broadcast: Conduit radius +2\n• Support mastery: Ultimate utility enhancement'
  }
};

// Handle class selection
characterClass.addEventListener('change', (e) => {
  const selectedClass = e.target.value;
  const container = document.querySelector('.container');
  
  // Remove all class-specific styling
  container.classList.remove('predator-selected', 'sentinel-selected', 'artificer-selected', 
                             'arcanist-selected', 'ranger-selected', 'saboteur-selected');
  
  if (selectedClass && classDescriptions[selectedClass]) {
    const classInfo = classDescriptions[selectedClass];
    classDescription.innerHTML = `<h3 style="color: ${classInfo.color}; margin-top: 0;">${classInfo.name}</h3><p>${classInfo.description.replace(/\n/g, '<br>')}</p>`;
    container.classList.add(`${selectedClass}-selected`);
  } else {
    classDescription.textContent = 'Select a class to see its description and abilities.';
  }
});

// Handle color preset selection
colorPresets.forEach(preset => {
  preset.addEventListener('click', (e) => {
    const color = e.target.dataset.color;
    characterColor.value = color;
    
    // Update selected state
    colorPresets.forEach(p => p.classList.remove('selected'));
    e.target.classList.add('selected');
  });
});

// Handle color picker change
characterColor.addEventListener('change', (e) => {
  // Remove selected state from presets when custom color is chosen
  colorPresets.forEach(p => p.classList.remove('selected'));
});

// Handle form submission
characterForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const name = characterName.value.trim();
  const selectedClass = characterClass.value;
  const color = characterColor.value;
  
  if (!name || !selectedClass || !color) {
    alert('Please fill in all fields');
    return;
  }
  
  // Sanitize character name (same as server-side sanitization)
  const sanitizedName = name.slice(0, 24).replace(/[^a-zA-Z0-9_\-]/g, '_');
  
  // Store character data
  const characterData = {
    name: sanitizedName,
    class: selectedClass,
    color: color,
    loginUser: localStorage.getItem('ftd_login_user')
  };
  
  localStorage.setItem('ftd_character', JSON.stringify(characterData));
  localStorage.setItem('ftd_player', sanitizedName); // Set player name for game
  localStorage.removeItem('ftd_is_guest'); // Ensure no guest flag
  
  // Redirect to game
  const map = localStorage.getItem('ftd_last_map') || 'map1';
  window.location.href = `/ftd?map=${map}&intro=1`;
});

// Handle back button
backBtn.addEventListener('click', () => {
  localStorage.removeItem('ftd_login_user');
  window.location.href = '/';
});

// Check if user came from login
window.addEventListener('load', () => {
  const loginUser = localStorage.getItem('ftd_login_user');
  if (!loginUser) {
    // Redirect back to login if no login user found
    window.location.href = '/';
  }
});