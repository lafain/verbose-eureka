// Menu System Module
const menuSystem = {
    isOpen: false,
    activeTab: 'inventory',
    activeLayer: 'character', // Track which layer is active
    // Reorganized tabs optimized for mobile and keyboard
    tabLayers: {
        character: ['inventory', 'equipment', 'skills'],
        social: ['friends', 'chat', 'trade'],
        world: ['map', 'blueprints', 'stats'],
        system: ['settings', 'controls', 'help']
    },
    // Legacy tabs array for compatibility
    tabs: ['inventory', 'equipment', 'skills', 'friends', 'chat', 'trade', 'map', 'blueprints', 'stats', 'settings', 'controls', 'help'],
    mapRefreshInterval: null,
    
    // Player data
    playerData: {
        name: 'Guest_' + Math.floor(Math.random() * 10000),
        level: 1,
        experience: 0,
        experienceToNext: 100,
        upgradePoints: 0,
        bodyColor: '#00ffff',
        isGuest: true,
        
        // Inventory
        weight: 0,
        maxWeight: 500,
        inventory: [],
        
        // Equipment slots
        equipment: {
            weapon: null,
            armor: null,
            utility1: null,
            utility2: null
        },
        
        // Stats
        stats: {
            integrity: 100,
            maxIntegrity: 100,
            charge: 100,
            maxCharge: 100,
            moveSpeed: 1.0,
            attackPower: 1.0,
            defense: 1.0
        },
        // Ownable blueprints (no weight, not in inventory). Defaults include Tent and Turret
        blueprints: {
            tent: true,
            turret: true,
            raiseTile: true
        },
        activeBlueprint: 'tent',
        
        // Controls (desktop)
        controls: {
            moveForward: 'W',
            moveBack: 'S',
            moveLeft: 'A',
            moveRight: 'D',
            aimUp: 'ArrowUp',
            aimDown: 'ArrowDown',
            aimLeft: 'ArrowLeft',
            aimRight: 'ArrowRight',
            fire: 'Space',
            interact: 'E',
            rotateCamera: 'Q/E',
            openMenu: 'Tab',
            buildMode: 'B',
            craftMenu: 'C'
        },
        
        // Skills and derived perk modifiers
        skillsPurchased: {}, // { perkId: true }
        perkMods: {
            moveMultiplier: 1.0,
            attackMultiplier: 1.0,
            damageTakenMultiplier: 1.0,
            chargeRegenPerSec: 0.0,
            turretDamageMultiplier: 1.0,
            turretRangeBonus: 0.0,
            synthYieldBonus: 0,
            conduitRegenBonus: 0.0,
            conduitRadiusBonus: 0.0,
            shieldRadiusBonus: 0.0
        }
    },
    
    // Six class trees
    skillTrees: {
        predator: {
            name: 'Predator', color: '#ff6666',
            perks: [
                { id: 'pred_fleetfoot', name: 'Fleet-Footed', desc: '+10% Move Speed', tier: 1, cost: 1, prereqs: [] },
                { id: 'pred_bloodlust', name: 'Bloodlust', desc: '+10% Weapon Damage', tier: 1, cost: 1, prereqs: [] },
                { id: 'pred_pounce', name: 'Pounce', desc: '+5% Jump/Traverse control (move speed bonus stacks +5%)', tier: 2, cost: 2, prereqs: ['pred_fleetfoot'] },
                { id: 'pred_frenzy', name: 'Frenzy', desc: '+10% Weapon Damage (stacks)', tier: 2, cost: 2, prereqs: ['pred_bloodlust'] },
                { id: 'pred_alpha', name: 'Alpha Predator', desc: '+10% Move Speed and +10% Weapon Damage', tier: 3, cost: 3, prereqs: ['pred_pounce','pred_frenzy'] }
            ]
        },
        sentinel: {
            name: 'Sentinel', color: '#66ccff',
            perks: [
                { id: 'sen_plate', name: 'Plating', desc: 'Take 10% less damage', tier: 1, cost: 1, prereqs: [] },
                { id: 'sen_bulwark', name: 'Bulwark', desc: '+10 Max Integrity', tier: 1, cost: 1, prereqs: [] },
                { id: 'sen_hardening', name: 'Hardening', desc: 'Take 10% less damage (stacks)', tier: 2, cost: 2, prereqs: ['sen_plate'] },
                { id: 'sen_capacitors', name: 'Capacitors', desc: '+10 Max Charge', tier: 2, cost: 2, prereqs: ['sen_bulwark'] },
                { id: 'sen_aegis', name: 'Aegis', desc: 'Take 10% less damage and +10 Max Integrity', tier: 3, cost: 3, prereqs: ['sen_hardening','sen_bulwark'] }
            ]
        },
        artificer: {
            name: 'Artificer', color: '#ffaa33',
            perks: [
                { id: 'art_grease', name: 'Grease the Gears', desc: 'Synthesizer +1 yield', tier: 1, cost: 1, prereqs: [] },
                { id: 'art_calipers', name: 'Calipers', desc: 'Turrets +10% damage', tier: 1, cost: 1, prereqs: [] },
                { id: 'art_assembly', name: 'Assembly Line', desc: 'Synthesizer +1 yield (stacks)', tier: 2, cost: 2, prereqs: ['art_grease'] },
                { id: 'art_barrels', name: 'Precision Barrels', desc: 'Turrets +10% damage (stacks)', tier: 2, cost: 2, prereqs: ['art_calipers'] },
                { id: 'art_factory', name: 'Factory Mind', desc: 'Synth +1 and Turret +10% dmg', tier: 3, cost: 3, prereqs: ['art_assembly','art_barrels'] }
            ]
        },
        arcanist: {
            name: 'Arcanist', color: '#bb66ff',
            perks: [
                { id: 'arc_conductor', name: 'Conductor', desc: '+0.5/s passive Charge regen', tier: 1, cost: 1, prereqs: [] },
                { id: 'arc_efficiency', name: 'Efficiency', desc: 'Weapons cost -10% charge', tier: 1, cost: 1, prereqs: [] },
                { id: 'arc_overflow', name: 'Overflow', desc: '+0.5/s passive Charge regen (stacks)', tier: 2, cost: 2, prereqs: ['arc_conductor'] },
                { id: 'arc_tuning', name: 'Tuning', desc: 'Weapons cost -10% charge (stacks)', tier: 2, cost: 2, prereqs: ['arc_efficiency'] },
                { id: 'arc_singularity', name: 'Singularity', desc: '+0.5/s Charge regen and -10% weapon cost', tier: 3, cost: 3, prereqs: ['arc_overflow','arc_tuning'] }
            ]
        },
        ranger: {
            name: 'Ranger', color: '#66ff99',
            perks: [
                { id: 'rng_stability', name: 'Stability', desc: '+10% weapon accuracy', tier: 1, cost: 1, prereqs: [] },
                { id: 'rng_draw', name: 'Quick Draw', desc: '+10% projectile speed/range', tier: 1, cost: 1, prereqs: [] },
                { id: 'rng_focus', name: 'Focus', desc: '+10% weapon accuracy (stacks)', tier: 2, cost: 2, prereqs: ['rng_stability'] },
                { id: 'rng_fletching', name: 'Fletching', desc: '+10% projectile speed/range (stacks)', tier: 2, cost: 2, prereqs: ['rng_draw'] },
                { id: 'rng_hawkeye', name: 'Hawkeye', desc: '+10% acc and +10% range', tier: 3, cost: 3, prereqs: ['rng_focus','rng_fletching'] }
            ]
        },
        saboteur: {
            name: 'Saboteur', color: '#cccc66',
            perks: [
                { id: 'sab_insulation', name: 'Insulation', desc: 'Conduit +0.5/s regen radius +1', tier: 1, cost: 1, prereqs: [] },
                { id: 'sab_capacitor', name: 'Overcharged', desc: 'Conduit +0.5/s regen', tier: 1, cost: 1, prereqs: [] },
                { id: 'sab_field', name: 'Field Tuning', desc: 'Shield radius +2', tier: 2, cost: 2, prereqs: ['sab_insulation'] },
                { id: 'sab_broadcast', name: 'Broadcast', desc: 'Conduit radius +2', tier: 2, cost: 2, prereqs: ['sab_capacitor'] },
                { id: 'sab_grid', name: 'Grid Harmony', desc: 'Conduit +0.5/s regen and +2 radius', tier: 3, cost: 3, prereqs: ['sab_field','sab_broadcast'] }
            ]
        }
    },
    
    init() {
        this.createMenuHTML();
        this.setupEventListeners();
        this.initializeInventory();
        // Determine guest status and name from localStorage
        try {
            const nm = localStorage.getItem('ftd_player');
            if (nm) this.playerData.name = nm;
            const guestFlag = localStorage.getItem('ftd_is_guest');
            if (guestFlag === '1') this.playerData.isGuest = true;
            else if (guestFlag === '0') this.playerData.isGuest = false;
            else this.playerData.isGuest = (typeof window.isGuestName === 'function') ? window.isGuestName(nm) : this.playerData.isGuest;
        } catch (_) {}
        // Capture base stats once to prevent stacking from perk reapplication
        try {
            if (!this.playerData.baseStats) {
                this.playerData.baseStats = {
                    maxIntegrity: this.playerData.stats.maxIntegrity,
                    maxCharge: this.playerData.stats.maxCharge,
                    moveSpeed: this.playerData.stats.moveSpeed,
                    attackPower: this.playerData.stats.attackPower,
                    defense: this.playerData.stats.defense
                };
            }
        } catch(_){ }
        // Only load persisted data for registered users
        if (!this.playerData.isGuest) this.loadPlayerData();
        // Auto-equip base weapon for guest/new players if none equipped
        const hasWeaponEquipped = !!this.playerData.equipment.weapon;
        const hasBasic = this.playerData.inventory.find(i => i.id === 'basic_weapon');
        if (!hasWeaponEquipped && hasBasic) {
            this.equipItem('basic_weapon', 'weapon');
            if (!this.playerData.isGuest) this.savePlayerData();
        }
        this.updateBlueprints();
        // Apply any previously purchased perks
        this.applyPerkEffects();
    },
    
    createMenuHTML() {
        const menuHTML = `
            <div id="gameMenu" class="game-menu hidden">
                <div class="menu-header">
                    <!-- Two-layer tab structure -->
                    <div class="menu-tab-layers">
                        <!-- Primary layer tabs -->
                        <div class="menu-layer primary-layer">
                            ${Object.keys(this.tabLayers).map(layer => 
                                `<button class="layer-tab ${layer === this.activeLayer ? 'active' : ''}" data-layer="${layer}">
                                    ${this.getLayerDisplayName(layer)}
                                </button>`
                            ).join('')}
                        </div>
                        <!-- Secondary layer tabs -->
                        <div class="menu-layer secondary-layer">
                            ${this.tabLayers[this.activeLayer].map(tab => 
                            `<button class="menu-tab ${tab === this.activeTab ? 'active' : ''}" data-tab="${tab}">
                                    ${this.getTabDisplayName(tab)}
                            </button>`
                        ).join('')}
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div id="menu-summary" style="display:flex;gap:8px;align-items:center;font:11px monospace;opacity:0.9;">
                        <span id="sum-level" title="Level">Lv 1</span>
                        <span id="sum-xp" title="XP">0/100</span>
                        <span id="sum-int" title="Integrity">INT 100/100</span>
                        <span id="sum-chg" title="Charge">CHG 100/100</span>
                        <span id="sum-weight" title="Weight">W 0/500</span>
                      </div>
                      <div id="menu-credits" style="color:#ffff88;font:12px monospace;margin-right:8px;">Credits: ...</div>
                    </div>
                    <button class="menu-close">×</button>
                </div>
                
                <!-- Scrollable content area -->
                <div class="menu-content-wrapper">
                    <div class="menu-content" id="menu-content">
                    <!-- Inventory Tab -->
                    <div class="tab-content" id="inventory-tab">
                        <div class="inventory-header">
                            <h3>Inventory</h3>
                            <div class="weight-display">
                                Weight: <span id="current-weight">0</span>/<span id="max-weight">500</span>
                            </div>
                        </div>
                        <div class="inventory-list" id="inventory-list">
                            <!-- Items will be added here dynamically -->
                        </div>
                    </div>
                        
                        <!-- Bluetooth Stores / Blueprints Tab (repurpose Blueprints tab) -->
                        <div class="tab-content hidden" id="blueprints-tab">
                            <div class="blueprint-preview" id="blueprint-preview"></div>
                            <div class="blueprint-grid" id="blueprint-grid"></div>
                            <div id="bpStore" style="margin-top:10px; border-top:1px solid #003355; padding-top:10px;">
                              <h4>Bluetooth Blueprint Store (Nearby Cities)</h4>
                              <div id="bpList"></div>
                        </div>
                    </div>
                    
                    <!-- Equipment Tab -->
                    <div class="tab-content hidden" id="equipment-tab">
                        <div class="equipment-container">
                            <div class="character-outline">
                                <div class="equipment-slot" data-slot="weapon">
                                    <div class="slot-label">Weapon</div>
                                    <div class="slot-item"></div>
                                </div>
                                <div class="equipment-slot" data-slot="armor">
                                    <div class="slot-label">Armor</div>
                                    <div class="slot-item"></div>
                                </div>
                                <div class="equipment-slot" data-slot="utility1">
                                    <div class="slot-label">Utility 1</div>
                                    <div class="slot-item"></div>
                                </div>
                                <div class="equipment-slot" data-slot="utility2">
                                    <div class="slot-label">Utility 2</div>
                                    <div class="slot-item"></div>
                                </div>
                            </div>
                            <div class="equipable-items">
                                <h3>Available Equipment</h3>
                                <div class="equipment-list" id="equipment-list">
                                    <!-- Equipable items will be added here -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Character Tab -->
                    <div class="tab-content hidden" id="character-tab">
                        <div class="character-stats">
                            <h3>Character</h3>
                            <div class="stat-line">Level: <span id="player-level">1</span></div>
                            <div class="stat-line">Upgrade Points: <span id="upgrade-points">0</span></div>
                            <div class="xp-bar"><div class="xp-fill" id="xp-fill"></div><span id="xp-text">0 / 100 XP</span></div>
                            <div class="stats-grid">
                                <div>Integrity: <span id="stat-integrity">100/100</span></div>
                                <div>Charge: <span id="stat-charge">100/100</span></div>
                                <div>Move Speed: <span id="stat-speed">1.0</span></div>
                                <div>Attack Power: <span id="stat-attack">1.0</span></div>
                                <div>Defense: <span id="stat-defense">1.0</span></div>
                            </div>
                        </div>
                        
                        <div class="character-customization">
                            <h3>Appearance</h3>
                            <div class="color-picker">
                                <label>Body Color:</label>
                                <input type="color" id="body-color" value="#00ffff" />
                            </div>
                        </div>
                    </div>
                        
                        <!-- Skills Tab -->
                        <div class="tab-content hidden" id="skills-tab">
                            <div id="skills-container"></div>
                    </div>
                    
                    <!-- Map Tab -->
                    <div class="tab-content hidden" id="map-tab">
                        <div class="map-container">
                            <h3>World Map</h3>
                                <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
                                  <label>Current Map:
                                    <select id="mapSelect"></select>
                                  </label>
                                  <button id="gotoCityBtn">Go To City</button>
                                  <select id="citySelect"></select>
                                </div>
                            <div class="map-canvas" id="map-canvas">
                                <canvas id="world-map" width="600" height="600"></canvas>
                            </div>
                            <div class="map-legend">
                                <div class="legend-item">
                                    <div class="legend-icon player-icon"></div>
                                    <span>Your Position</span>
                                </div>
                                <div class="legend-item">
                                    <div class="legend-icon city-icon"></div>
                                    <span>Cities</span>
                                </div>
                                <div class="legend-item">
                                    <div class="legend-icon road-icon"></div>
                                    <span>Roads</span>
                                </div>
                                <div class="legend-item">
                                    <div class="legend-icon spawn-icon"></div>
                                    <span>Spawn Point</span>
                                </div>
                                    <div class="legend-item">
                                        <div class="legend-icon" style="background:#88ffff;border:1px solid #88ffff;"></div>
                                        <span>Portal</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Friends Tab -->
                        <div class="tab-content hidden" id="friends-tab">
                            <div style="display:flex; gap:12px; align-items:flex-start;">
                                <div style="flex:1; min-width:220px;">
                                    <h3>Friends</h3>
                                    <ul id="friendsList" style="list-style:none;padding:0;margin:0;max-height:180px;overflow:auto;"></ul>
                                    <h4 style="margin-top:10px;">Invites</h4>
                                    <ul id="invitesList" style="list-style:none;padding:0;margin:0;max-height:120px;overflow:auto;"></ul>
                                    <div style="margin-top:8px; display:flex; gap:6px;">
                                        <input id="friendNameInput" type="text" placeholder="Add friend by name" style="flex:1;">
                                        <button id="sendInviteBtn">Invite</button>
                                    </div>
                                    <div style="margin-top:8px;">
                                        <div style="font-size:12px;color:#88ccff;">Online: <span id="onlineUsers"></span></div>
                                    </div>
                                    <div style="margin-top:12px;">
                                        <h4>Economy</h4>
                                        <div id="econCredits">Credits: ...</div>
                                        <div id="econItems" style="max-height:140px;overflow:auto;border:1px solid #003355;padding:6px;margin-top:6px;"></div>
                                        <div style="display:flex;gap:6px;margin-top:6px;">
                                            <input id="tradeToInput" type="text" placeholder="Trade with (name)" style="flex:1;">
                                            <button id="btnTradeReq">Request</button>
                                        </div>
                                        <div style="display:flex;gap:6px;margin-top:6px;">
                                            <input id="tradeItemId" type="text" placeholder="Item ID">
                                            <input id="tradeCreditsOffer" type="number" placeholder="Credits">
                                            <button id="btnTradeOffer">Offer</button>
                                        </div>
                                    </div>
                                </div>
                                <div style="flex:1.6; min-width:300px;">
                                    <h3>Chat</h3>
                                    <div id="chatLog" style="height:260px; overflow:auto; border:1px solid #00ffff; padding:6px; background:rgba(0,0,0,0.4)"></div>
                                    <div style="display:flex; gap:6px; margin-top:6px;">
                                        <input id="chatToInput" type="text" placeholder="DM to (optional)">
                                        <input id="chatMsgInput" type="text" placeholder="Type a message" style="flex:1;">
                                        <button id="chatSendBtn">Send</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Expansion/Crafting Tab -->
                    <div class="tab-content hidden" id="expansion-tab">
                        <div id="crafting-section"></div>
                    </div>
                    
                    <!-- Settings Tab -->
                    <div class="tab-content hidden" id="settings-tab">
                        <div class="settings-controls"></div>
                    </div>
                    
                    <!-- Controls Tab -->
                    <div class="tab-content hidden" id="controls-tab">
                        <div class="controls-list"></div>
                    </div>
                    
                    <!-- Chat Tab -->
                    <div class="tab-content hidden" id="chat-tab">
                        <h3>Global Chat</h3>
                        <div id="chatMessages" style="height:300px; overflow:auto; border:1px solid #00ffff; padding:10px; background:rgba(0,0,0,0.4); margin-bottom:10px;"></div>
                        <div style="display:flex; gap:10px;">
                            <input id="chatInput" type="text" placeholder="Type a message..." style="flex:1; padding:8px; background:rgba(0,255,255,0.1); border:1px solid #00ffff; color:#00ffff;">
                            <button id="sendChatBtn" style="padding:8px 20px;">Send</button>
                        </div>
                    </div>
                    
                    <!-- Trade Tab -->
                    <div class="tab-content hidden" id="trade-tab">
                        <h3>Trade System</h3>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                            <div>
                                <h4>Your Offer</h4>
                                <div id="yourTradeOffer" style="border:1px solid #00ffff; padding:10px; min-height:150px; background:rgba(0,255,255,0.05);"></div>
                            </div>
                            <div>
                                <h4>Their Offer</h4>
                                <div id="theirTradeOffer" style="border:1px solid #ff00ff; padding:10px; min-height:150px; background:rgba(255,0,255,0.05);"></div>
                            </div>
                        </div>
                        <div style="margin-top:20px;">
                            <input id="tradePartner" type="text" placeholder="Trade with player name..." style="width:100%; padding:8px; margin-bottom:10px;">
                            <button id="initiateTrade" style="padding:8px 20px;">Initiate Trade</button>
                        </div>
                    </div>
                    
                    <!-- Stats Tab -->
                    <div class="tab-content hidden" id="stats-tab">
                        <h3>Player Statistics</h3>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                            <div>
                                <h4>Combat Stats</h4>
                                <div class="stat-item">Enemies Defeated: <span id="enemiesDefeated">0</span></div>
                                <div class="stat-item">Total Damage Dealt: <span id="damageDealt">0</span></div>
                                <div class="stat-item">Total Damage Taken: <span id="damageTaken">0</span></div>
                                <div class="stat-item">Deaths: <span id="deathCount">0</span></div>
                            </div>
                            <div>
                                <h4>Progress Stats</h4>
                                <div class="stat-item">Buildings Placed: <span id="buildingsPlaced">0</span></div>
                                <div class="stat-item">Resources Gathered: <span id="resourcesGathered">0</span></div>
                                <div class="stat-item">Distance Traveled: <span id="distanceTraveled">0</span></div>
                                <div class="stat-item">Time Played: <span id="timePlayed">0:00</span></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Help Tab -->
                    <div class="tab-content hidden" id="help-tab">
                        <h3>Game Help</h3>
                        <div style="max-height:400px; overflow:auto;">
                            <h4>Controls</h4>
                            <p>Movement: WASD keys<br>
                            Sprint: Hold Shift<br>
                            Interact: F key<br>
                            Build Mode: B key<br>
                            Open Menu: Tab key<br>
                            Rotate Camera: Q/E keys</p>
                            
                            <h4>Gameplay Tips</h4>
                            <p>• Cities are safe zones - enemies cannot spawn there<br>
                            • Build defenses to protect your territory<br>
                            • Trade with other players for better equipment<br>
                            • Gather resources to craft items and buildings<br>
                            • Level up to unlock new skills and abilities</p>
                            
                            <h4>Mobile Controls</h4>
                            <p>• Use the left joystick to move<br>
                            • Tap buttons on the right for actions<br>
                            • Hold the sprint button to move faster<br>
                            • Use camera rotation buttons to look around</p>
                        </div>
                    </div>
                     </div>
                </div>
            </div>
            
            <!-- Mobile menu button -->
            ${window.isMobile ? '<button id="mobile-menu-btn" class="mobile-menu-btn">☰</button>' : ''}
        `;
        
        document.body.insertAdjacentHTML('beforeend', menuHTML);
    },
    
    getLayerDisplayName(layer) {
        const layerNames = {
            character: 'CHARACTER',
            social: 'SOCIAL',
            world: 'WORLD',
            system: 'SYSTEM'
        };
        return layerNames[layer] || layer.toUpperCase();
    },

    getTabDisplayName(tab) {
        const tabNames = {
            inventory: 'INV',
            equipment: 'EQUIP',
            skills: 'SKILLS',
            friends: 'FRIENDS',
            chat: 'CHAT',
            trade: 'TRADE',
            map: 'MAP',
            blueprints: 'BUILD',
            stats: 'STATS',
            settings: 'SET',
            controls: 'CTRL',
            help: 'HELP'
        };
        return tabNames[tab] || tab.toUpperCase();
    },
    
    getDesktopControlsHTML() {
        return `
            <div class="controls-list">
                ${Object.entries(this.playerData.controls).map(([action, key]) => `
                    <div class="control-item">
                        <span class="control-action">${this.formatActionName(action)}:</span>
                        <button class="control-key" data-action="${action}">${key}</button>
                    </div>
                `).join('')}
            </div>
            <p class="control-hint">Click on a key to change the binding</p>
        `;
    },
    
    getMobileControlsHTML() {
        return `
            <div class="mobile-controls-info">
                <div class="control-info">
                    <h4>Movement</h4>
                    <p>Use the left joystick to move your character</p>
                </div>
                <div class="control-info">
                    <h4>Aiming</h4>
                    <p>Use the right joystick to aim</p>
                </div>
                <div class="control-info">
                    <h4>Fire</h4>
                    <p>Tap the fire button to shoot</p>
                </div>
                <div class="control-info">
                    <h4>Camera</h4>
                    <p>Use the camera rotation buttons to change view</p>
                </div>
                <div class="control-info">
                    <h4>Build Mode</h4>
                    <p>Tap the build button to enter build mode</p>
                </div>
            </div>
        `;
    },
    
    formatActionName(action) {
        return action.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    },
    
    setupEventListeners() {
        // Tab key for keyboard
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    this.toggle();
                }
            });
        
        // Mobile menu button (from our new mobile UI)
        const mobileMenuBtn = document.getElementById('btnMenu');
        if (mobileMenuBtn) {
            // Remove any existing listeners to avoid duplicates
            const newBtn = mobileMenuBtn.cloneNode(true);
            mobileMenuBtn.parentNode.replaceChild(newBtn, mobileMenuBtn);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggle();
            });
        }
        
        // Legacy mobile menu button support
        const legacyMenuBtn = document.getElementById('mobile-menu-btn');
        if (legacyMenuBtn) {
            legacyMenuBtn.addEventListener('click', () => this.toggle());
        }
        
        // Close button
        const closeBtn = document.querySelector('.menu-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeMenu());
        }
        
        // Layer switching
        document.querySelectorAll('.layer-tab').forEach(layerTab => {
            layerTab.addEventListener('click', (e) => {
                this.switchLayer(e.target.dataset.layer);
            });
        });
        
        // Tab switching
        document.querySelectorAll('.menu-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Character customization
        const bodyColorInput = document.getElementById('body-color');
        if (bodyColorInput) {
            bodyColorInput.addEventListener('change', (e) => {
                this.updateBodyColor(e.target.value);
            });
        }
        
        // Name change
        const nameInput = document.getElementById('player-name');
        if (nameInput) {
            nameInput.addEventListener('change', (e) => {
                this.updatePlayerName(e.target.value);
            });
        }
        
        // Register account button
        const registerBtn = document.getElementById('register-account');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.showRegistrationForm());
        }
        
        // Settings listeners
        this.setupSettingsListeners();
        
        // Social wiring
        this.setupFriendsAndChat();
        this.setupEconomyUI();
        
        // Control rebinding (desktop only)
        if (!window.isMobile) {
            this.setupControlRebinding();
        }
        
        // Drag and drop for equipment
        this.setupDragAndDrop();
    },
    
    setupSettingsListeners() {
        const volumeSlider = document.getElementById('master-volume');
        const volumeValue = document.getElementById('volume-value');
        if (volumeSlider && volumeValue) {
            volumeSlider.addEventListener('input', (e) => {
                volumeValue.textContent = e.target.value;
                // Apply volume setting
            });
        }
        
        const graphicsSelect = document.getElementById('graphics-quality');
        if (graphicsSelect) {
            graphicsSelect.addEventListener('change', (e) => {
                this.updateGraphicsQuality(e.target.value);
            });
        }
    },
    
    setupControlRebinding() {
        let rebindingAction = null;
        
        document.querySelectorAll('.control-key').forEach(button => {
            button.addEventListener('click', (e) => {
                if (rebindingAction) {
                    document.querySelector(`[data-action="${rebindingAction}"]`).classList.remove('rebinding');
                }
                
                rebindingAction = e.target.dataset.action;
                e.target.classList.add('rebinding');
                e.target.textContent = 'Press a key...';
                
                const handleKeyPress = (event) => {
                    event.preventDefault();
                    
                    if (event.key === 'Escape') {
                        e.target.textContent = this.playerData.controls[rebindingAction];
                    } else {
                        this.playerData.controls[rebindingAction] = event.key;
                        e.target.textContent = event.key;
                        this.savePlayerData();
                    }
                    
                    e.target.classList.remove('rebinding');
                    rebindingAction = null;
                    document.removeEventListener('keydown', handleKeyPress);
                };
                
                document.addEventListener('keydown', handleKeyPress);
            });
        });
    },
    
    setupDragAndDrop() {
        if (window.isMobile) return; // Touch drag-drop handled differently
        
        const equipmentSlots = document.querySelectorAll('.equipment-slot');
        const equipableItems = document.querySelectorAll('.equipable-item');
        
        // Make items draggable
        equipableItems.forEach(item => {
            item.draggable = true;
            item.addEventListener('dragstart', this.handleDragStart.bind(this));
            item.addEventListener('dragend', this.handleDragEnd.bind(this));
        });
        
        // Make slots droppable
        equipmentSlots.forEach(slot => {
            slot.addEventListener('dragover', this.handleDragOver.bind(this));
            slot.addEventListener('drop', this.handleDrop.bind(this));
            slot.addEventListener('dragleave', this.handleDragLeave.bind(this));
        });
    },
    
    handleDragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('itemId', e.target.dataset.itemId);
        e.target.classList.add('dragging');
    },
    
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    },
    
    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');
        return false;
    },
    
    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    },
    
    handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        
        const itemId = e.dataTransfer.getData('itemId');
        const slot = e.currentTarget.dataset.slot;
        
        this.equipItem(itemId, slot);
        e.currentTarget.classList.remove('drag-over');
        
        return false;
    },
    
    initializeInventory() {
        // Add some sample items
        this.playerData.inventory = [
            { id: 'hex_dust', name: 'Hex-Dust', count: 50, weight: 0.1, type: 'material' },
            { id: 'lumin_grain', name: 'Lumin-Grain', count: 30, weight: 0.2, type: 'material' },
            { id: 'basic_weapon', name: 'Kinetic Projector', count: 1, weight: 5, type: 'weapon', equipped: false },
            { id: 'basic_armor', name: 'Light Plating', count: 1, weight: 10, type: 'armor', equipped: false },
            { id: 'health_pack', name: 'Repair Kit', count: 5, weight: 1, type: 'consumable' }
        ];
        
        this.updateInventoryDisplay();
    },
    
    updateInventoryDisplay() {
        const inventoryList = document.getElementById('inventory-list');
        if (!inventoryList) return;
        
        // Calculate total weight
        this.playerData.weight = this.playerData.inventory.reduce((total, item) => 
            total + (item.weight * item.count), 0
        );
        
        // Update weight display
        document.getElementById('current-weight').textContent = this.playerData.weight.toFixed(1);
        document.getElementById('max-weight').textContent = this.playerData.maxWeight;
        
        // Update inventory list
        inventoryList.innerHTML = this.playerData.inventory.map(item => `
            <div class="inventory-item ${item.equipped ? 'equipped' : ''}" data-item-id="${item.id}">
                <span class="item-name">${item.name}</span>
                <span class="item-count">x${item.count}</span>
                <span class="item-weight">${(item.weight * item.count).toFixed(1)} kg</span>
                ${item.equipped ? '<span class="equipped-badge">EQUIPPED</span>' : ''}
            </div>
        `).join('');
        
        // Update equipment list
        this.updateEquipmentList();
        this.updateMenuSummary();
    },
    
    updateEquipmentList() {
        const equipmentList = document.getElementById('equipment-list');
        if (!equipmentList) return;
        
        const equipableItems = this.playerData.inventory.filter(item => 
            item.type === 'weapon' || item.type === 'armor' || item.type === 'utility'
        );
        
        equipmentList.innerHTML = equipableItems.map(item => `
            <div class="equipable-item" draggable="true" data-item-id="${item.id}">
                <span class="item-name">${item.name}</span>
                ${item.equipped ? '<span class="equipped-badge">EQUIPPED</span>' : ''}
            </div>
        `).join('');
        
        // Re-setup drag and drop for new items
        this.setupDragAndDrop();
        this.updateMenuSummary();
    },
    
    equipItem(itemId, slot) {
        const item = this.playerData.inventory.find(i => i.id === itemId);
        if (!item) return;
        
        // Check if item type matches slot
        if ((slot === 'weapon' && item.type !== 'weapon') ||
            (slot === 'armor' && item.type !== 'armor') ||
            ((slot === 'utility1' || slot === 'utility2') && item.type !== 'utility')) {
            return;
        }
        
        // Unequip current item in slot
        if (this.playerData.equipment[slot]) {
            const currentItem = this.playerData.inventory.find(i => i.id === this.playerData.equipment[slot]);
            if (currentItem) currentItem.equipped = false;
        }
        
        // Equip new item
        this.playerData.equipment[slot] = itemId;
        item.equipped = true;
        
        // Bridge equipped weapon to combat system template
        if (slot === 'weapon' && window.combatSystem && window.combatSystem.combatState && window.combatSystem.WEAPONS) {
            let template = null;
            if (item.__econ && item.__econ.template) template = item.__econ.template;
            if (!template && item.id === 'basic_weapon') template = 'kineticProjector';
            if (template && window.combatSystem.WEAPONS[template]) {
                window.combatSystem.combatState.playerStats.equipment.weapon = template;
                window.menuSystem && window.menuSystem.showNotification(`Equipped ${item.name}`);
            }
        }
        // Bridge armor resistances to combat
        if (slot === 'armor') {
            try {
                const res = (item.__econ && item.__econ.mods && item.__econ.mods.resist) ? item.__econ.mods.resist : (item.mods && item.mods.resist ? item.mods.resist : {});
                window.__equippedArmorResists = res || {};
                window.menuSystem && window.menuSystem.showNotification(`Armor: ${item.name}`);
            } catch(_){}
        }
        
        // Update displays
        this.updateInventoryDisplay();
        this.updateEquipmentSlots();
    },
    
    updateEquipmentSlots() {
        Object.entries(this.playerData.equipment).forEach(([slot, itemId]) => {
            const slotElement = document.querySelector(`[data-slot="${slot}"] .slot-item`);
            if (slotElement) {
                if (itemId) {
                    const item = this.playerData.inventory.find(i => i.id === itemId);
                    slotElement.innerHTML = item ? `<div class="equipped-item">${item.name}</div>` : '';
                } else {
                    slotElement.innerHTML = '';
                }
            }
        });
    },
    
    addExperience(amount) {
        this.playerData.experience += Math.floor(amount);
        
        // Check for level up
        while (this.playerData.experience >= this.playerData.experienceToNext) {
            this.playerData.experience -= this.playerData.experienceToNext;
            this.levelUp();
        }
        
        this.updateCharacterDisplay();
    },
    
    levelUp() {
        this.playerData.level++;
        this.playerData.upgradePoints += 3; // 3 points per level
        
        // Exponential XP requirement
        this.playerData.experienceToNext = Math.floor(100 * Math.pow(1.5, this.playerData.level - 1));
        
        // Show level up notification
        this.showNotification(`Level Up! You are now level ${this.playerData.level}`);
        
        // Update stats slightly
        this.playerData.stats.maxIntegrity += 10;
        this.playerData.stats.maxCharge += 5;
        this.playerData.stats.integrity = this.playerData.stats.maxIntegrity;
        this.playerData.stats.charge = this.playerData.stats.maxCharge;
    },
    
    // Skills UI
    renderSkillsUI() {
        const container = document.getElementById('skills-container');
        if (!container) return;
        const pts = this.playerData.upgradePoints;
        const purchased = this.playerData.skillsPurchased || {};
        const trees = this.skillTrees;
        container.innerHTML = Object.entries(trees).map(([key, tree]) => {
            const perksHTML = tree.perks.map(p => {
                const owned = !!purchased[p.id];
                const canAfford = pts >= p.cost;
                const prereqOk = (p.prereqs||[]).every(id => purchased[id]);
                const cls = ['perk', owned ? 'owned' : '', (!owned && (!canAfford || !prereqOk)) ? 'locked' : '', `tier-${p.tier}`].join(' ');
                return `<button class="${cls}" data-perk="${p.id}" title="${p.desc}\nCost: ${p.cost} pt${p.cost>1?'s':''}\nTier ${p.tier}">${p.name}</button>`;
            }).join('');
            return `
                <div class="skill-tree" data-tree="${key}">
                    <div class="tree-header" style="color:${tree.color}">${tree.name}</div>
                    <div class="tree-grid">${perksHTML}</div>
                </div>
            `;
        }).join('');
        // Bind clicks
        container.querySelectorAll('button.perk').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.perk;
                this.purchasePerk(id);
            });
        });
        // Points indicator
        const header = document.createElement('div');
        header.className = 'skills-header';
        header.textContent = `Upgrade Points: ${pts}`;
        container.prepend(header);
    },
    
    purchasePerk(perkId) {
        if (this.playerData.skillsPurchased[perkId]) return;
        // Find perk
        let perk = null;
        Object.values(this.skillTrees).some(t => {
            const f = t.perks.find(p => p.id === perkId);
            if (f) { perk = f; return true; }
            return false;
        });
        if (!perk) return;
        // Check prereqs/cost
        const prereqOk = (perk.prereqs||[]).every(id => this.playerData.skillsPurchased[id]);
        if (!prereqOk) { this.showNotification('Requires prerequisite perk'); return; }
        if (this.playerData.upgradePoints < perk.cost) { this.showNotification('Not enough upgrade points'); return; }
        // Spend
        this.playerData.upgradePoints -= perk.cost;
        this.playerData.skillsPurchased[perkId] = true;
        this.applyPerkEffects();
        this.updateCharacterDisplay();
        this.renderSkillsUI();
        if (!this.playerData.isGuest) this.savePlayerData();
    },
    
    applyPerkEffects() {
        // Reset to defaults
        const pm = this.playerData.perkMods;
        pm.moveMultiplier = 1.0;
        pm.attackMultiplier = 1.0;
        pm.damageTakenMultiplier = 1.0;
        pm.chargeRegenPerSec = 0.0;
        pm.turretDamageMultiplier = 1.0;
        pm.turretRangeBonus = 0.0;
        pm.synthYieldBonus = 0;
        pm.conduitRegenBonus = 0.0;
        pm.conduitRadiusBonus = 0.0;
        pm.shieldRadiusBonus = 0.0;
        // Reset stat maxima to base before applying perks
        try {
            if (this.playerData.baseStats) {
                this.playerData.stats.maxIntegrity = this.playerData.baseStats.maxIntegrity;
                this.playerData.stats.maxCharge = this.playerData.baseStats.maxCharge;
            }
        } catch(_){ }
        const owned = this.playerData.skillsPurchased || {};
        const has = (id) => !!owned[id];
        // Predator
        if (has('pred_fleetfoot')) pm.moveMultiplier *= 1.10;
        if (has('pred_bloodlust')) pm.attackMultiplier *= 1.10;
        if (has('pred_pounce')) pm.moveMultiplier *= 1.05;
        if (has('pred_frenzy')) pm.attackMultiplier *= 1.10;
        if (has('pred_alpha')) { pm.moveMultiplier *= 1.10; pm.attackMultiplier *= 1.10; }
        // Sentinel
        if (has('sen_plate')) pm.damageTakenMultiplier *= 0.90;
        if (has('sen_bulwark')) this.playerData.stats.maxIntegrity += 10;
        if (has('sen_hardening')) pm.damageTakenMultiplier *= 0.90;
        if (has('sen_capacitors')) this.playerData.stats.maxCharge += 10;
        if (has('sen_aegis')) { pm.damageTakenMultiplier *= 0.90; this.playerData.stats.maxIntegrity += 10; }
        // Artificer
        if (has('art_grease')) pm.synthYieldBonus += 1;
        if (has('art_calipers')) pm.turretDamageMultiplier *= 1.10;
        if (has('art_assembly')) pm.synthYieldBonus += 1;
        if (has('art_barrels')) pm.turretDamageMultiplier *= 1.10;
        if (has('art_factory')) { pm.synthYieldBonus += 1; pm.turretDamageMultiplier *= 1.10; }
        // Arcanist
        if (has('arc_conductor')) pm.chargeRegenPerSec += 0.5;
        if (has('arc_efficiency')) this.__weaponCostFactor = (this.__weaponCostFactor||1.0) * 0.90;
        if (has('arc_overflow')) pm.chargeRegenPerSec += 0.5;
        if (has('arc_tuning')) this.__weaponCostFactor = (this.__weaponCostFactor||1.0) * 0.90;
        if (has('arc_singularity')) { pm.chargeRegenPerSec += 0.5; this.__weaponCostFactor = (this.__weaponCostFactor||1.0) * 0.90; }
        // Ranger
        if (has('rng_stability')) this.__weaponAccuracyBonus = (this.__weaponAccuracyBonus||0) + 0.10;
        if (has('rng_draw')) this.__projectileSpeedBonus = (this.__projectileSpeedBonus||0) + 0.10;
        if (has('rng_focus')) this.__weaponAccuracyBonus = (this.__weaponAccuracyBonus||0) + 0.10;
        if (has('rng_fletching')) this.__projectileSpeedBonus = (this.__projectileSpeedBonus||0) + 0.10;
        if (has('rng_hawkeye')) { this.__weaponAccuracyBonus = (this.__weaponAccuracyBonus||0) + 0.10; this.__projectileSpeedBonus = (this.__projectileSpeedBonus||0) + 0.10; }
        // Saboteur
        if (has('sab_insulation')) { pm.conduitRegenBonus += 0.5; pm.conduitRadiusBonus += 1.0; }
        if (has('sab_capacitor')) pm.conduitRegenBonus += 0.5;
        if (has('sab_field')) pm.shieldRadiusBonus += 2.0;
        if (has('sab_broadcast')) pm.conduitRadiusBonus += 2.0;
        if (has('sab_grid')) { pm.conduitRegenBonus += 0.5; pm.conduitRadiusBonus += 2.0; }
        // Clamp current to max
        this.playerData.stats.integrity = Math.min(this.playerData.stats.integrity, this.playerData.stats.maxIntegrity);
        this.playerData.stats.charge = Math.min(this.playerData.stats.charge, this.playerData.stats.maxCharge);
    },
    
    updateCharacterDisplay() {
        document.getElementById('player-level').textContent = this.playerData.level;
        document.getElementById('upgrade-points').textContent = this.playerData.upgradePoints;
        
        const xpFill = document.getElementById('xp-fill');
        const xpText = document.getElementById('xp-text');
        if (xpFill && xpText) {
            const xpPercent = (this.playerData.experience / this.playerData.experienceToNext) * 100;
            xpFill.style.width = xpPercent + '%';
            xpText.textContent = `${this.playerData.experience} / ${this.playerData.experienceToNext} XP`;
        }
        
        // Update stats display
        document.getElementById('stat-integrity').textContent = 
            `${this.playerData.stats.integrity}/${this.playerData.stats.maxIntegrity}`;
        document.getElementById('stat-charge').textContent = 
            `${this.playerData.stats.charge}/${this.playerData.stats.maxCharge}`;
        document.getElementById('stat-speed').textContent = (this.playerData.stats.moveSpeed * (this.playerData.perkMods.moveMultiplier||1)).toFixed(1);
        document.getElementById('stat-attack').textContent = (this.playerData.stats.attackPower * (this.playerData.perkMods.attackMultiplier||1)).toFixed(1);
        document.getElementById('stat-defense').textContent = (this.playerData.stats.defense).toFixed(1);
        this.updateMenuSummary();
    },
    
    updateBodyColor(color) {
        this.playerData.bodyColor = color;
        
        // Update the player model color in the game
        if (window.player && window.player.mesh) {
            window.player.mesh.material.color.set(color);
        }
        
        this.savePlayerData();
    },
    
    updatePlayerName(name) {
        this.playerData.name = name;
        this.savePlayerData();
        
        // Update name in multiplayer
        if (window.socket) {
            window.socket.emit('updateName', name);
        }
    },
    
    updateGraphicsQuality(quality) {
        // Apply graphics settings
        if (window.renderer) {
            switch(quality) {
                case 'low':
                    window.renderer.setPixelRatio(1);
                    // Reduce other quality settings
                    break;
                case 'medium':
                    window.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                    break;
                case 'high':
                    window.renderer.setPixelRatio(window.devicePixelRatio);
                    // Enable additional effects
                    break;
            }
        }
        
        this.savePlayerData();
    },
    
    showRegistrationForm() {
        const formHTML = `
            <div class="registration-overlay">
                <div class="registration-form">
                    <h3>Register Account</h3>
                    <input type="text" id="reg-username" placeholder="Username" />
                    <input type="email" id="reg-email" placeholder="Email" />
                    <input type="password" id="reg-password" placeholder="Password" />
                    <input type="password" id="reg-confirm" placeholder="Confirm Password" />
                    <button id="submit-registration">Register</button>
                    <button id="cancel-registration">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', formHTML);
        
        document.getElementById('submit-registration').addEventListener('click', () => {
            // Handle registration
            this.handleRegistration();
        });
        
        document.getElementById('cancel-registration').addEventListener('click', () => {
            document.querySelector('.registration-overlay').remove();
        });
    },
    
    handleRegistration() {
        // This would connect to backend for actual registration
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm').value;
        
        if (password !== confirm) {
            alert('Passwords do not match!');
            return;
        }
        
        // For now, just update local data
        this.playerData.isGuest = false;
        this.playerData.name = username;
        
        document.querySelector('.registration-overlay').remove();
        document.getElementById('guest-account-section').innerHTML = `
            <h4>Account</h4>
            <p>Registered as: ${username}</p>
        `;
        
        this.savePlayerData();
    },
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'menu-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    },
    
    toggle() {
        this.isOpen = !this.isOpen;
        const menu = document.getElementById('gameMenu');
        if (menu) {
            menu.classList.toggle('hidden', !this.isOpen);
            
            // Handle map refresh
            if (this.isOpen && this.activeTab === 'map') {
                this.startMapRefresh();
            } else {
                this.stopMapRefresh();
            }
            
            // Ensure correct layer is active when opening
            if (this.isOpen) {
                this.ensureCorrectLayer();
            }
            
            // Handle cursor visibility
            if (!window.isMobile) {
                document.body.style.cursor = this.isOpen ? 'auto' : 'none';
            }
            // Ensure logout button exists
            this.ensureLogoutButton();
        }
        
        // Pause/resume game
        if (window.gameState) {
            window.gameState.paused = this.isOpen;
        }
    },

    ensureLogoutButton() {
        let btn = document.getElementById('logoutBtn');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'logoutBtn';
            btn.textContent = 'Logout';
            btn.style.cssText = 'position:absolute;top:8px;right:8px;padding:6px 8px;border:1px solid #ff6666;background:#220000;color:#ff6666;cursor:pointer;';
            document.getElementById('gameMenu').appendChild(btn);
            btn.onclick = this.handleLogout.bind(this);
        }
        this.updateLogoutButtonStyle();
    },

    updateLogoutButtonStyle() {
        const btn = document.getElementById('logoutBtn'); if (!btn) return;
        const inCity = (()=>{
            try {
                if (!Array.isArray(window.CITIES) || !window.player) return false;
                return window.CITIES.some(c => c && Math.hypot(window.player.position.x - c.x, window.player.position.z - c.z) <= ((c.radius||100)+10));
            } catch(_) { return false; }
        })();
        const inTent = !!window.__ftd_inTent;
        const safe = inCity || inTent;
        btn.style.borderColor = safe ? '#00ff99' : '#ff6666';
        btn.style.background = safe ? '#002211' : '#220000';
        btn.style.color = safe ? '#00ff99' : '#ff6666';
        btn.title = safe ? 'Safe to logout' : 'Unsafe: 20s countdown & canceled if hit';
    },

    handleLogout() {
        this.updateLogoutButtonStyle();
        const inCity = (()=>{ try { if (!Array.isArray(window.CITIES) || !window.player) return false; return window.CITIES.some(c => Math.hypot(window.player.position.x - c.x, window.player.position.z - c.z) <= ((c.radius||100)+10)); } catch(_) { return false; } })();
        const inTent = !!window.__ftd_inTent;
        const safe = inCity || inTent;
        if (safe) {
            // Immediate logout
            try { window.socket && window.socket.emit('requestLogout'); window.socket && window.socket.on('logoutReady', ()=>{ window.socket.emit('confirmLogout'); window.location.href='/'; }); } catch(_){}
            return;
        }
        // Unsafe: show 20s countdown, cancel on damage (takeDamage hook cancels)
        let overlay = document.getElementById('logoutOverlay');
        if (!overlay) {
            overlay = document.createElement('div'); overlay.id='logoutOverlay';
            overlay.style.cssText='position:fixed;inset:0;background:rgba(40,0,0,0.6);z-index:22000;display:flex;align-items:center;justify-content:center;';
            const panel = document.createElement('div'); panel.style.cssText='background:#110000;border:1px solid #ff6666;color:#ff6666;font:14px monospace;padding:12px 16px;border-radius:6px;';
            panel.innerHTML = '<div>Unsafe Logout: stand still for <span id="logoutSec">20</span>s. Any damage cancels.</div><div style="margin-top:8px;text-align:right;"><button id="cancelLogout">Cancel</button></div>';
            overlay.appendChild(panel); document.body.appendChild(overlay);
            panel.querySelector('#cancelLogout').onclick = ()=>{ try { window.cancelLogoutCountdown && window.cancelLogoutCountdown('cancel'); } catch(_){} };
        }
        const secEl = document.getElementById('logoutSec');
        let remain = 20; secEl.textContent = String(remain);
        const tick = ()=>{
            if (!document.getElementById('logoutOverlay')) return; // canceled
            remain -= 1; if (remain <= 0) { try { window.socket && window.socket.emit('requestLogout'); window.socket && window.socket.on('logoutReady', ()=>{ window.socket.emit('confirmLogout'); window.location.href='/'; }); } catch(_){}; try { overlay.remove(); } catch(_){}; return; }
            secEl.textContent = String(remain);
            window.__logoutTimer = setTimeout(tick, 1000);
        };
        window.cancelLogoutCountdown = (why)=>{ try { if (window.__logoutTimer) { clearTimeout(window.__logoutTimer); window.__logoutTimer=null; } const o=document.getElementById('logoutOverlay'); o && o.remove(); if (why==='damage') { this.showNotification('Logout canceled (damage)'); } } catch(_){} };
        window.__logoutTimer = setTimeout(tick, 1000);
    },
    
    startMapRefresh() {
        // Initial render
        this.renderWorldMap();
        
        // Refresh every 500ms for smooth updates
        this.mapRefreshInterval = setInterval(() => {
            if (this.isOpen && this.activeTab === 'map') {
                this.renderWorldMap();
            }
        }, 500);
    },
    
    stopMapRefresh() {
        if (this.mapRefreshInterval) {
            clearInterval(this.mapRefreshInterval);
            this.mapRefreshInterval = null;
        }
    },
    
    toggleMenu() {
        this.toggle();
    },

    ensureCorrectLayer() {
        // Find which layer contains the current active tab
        for (const [layerName, tabs] of Object.entries(this.tabLayers)) {
            if (tabs.includes(this.activeTab)) {
                if (this.activeLayer !== layerName) {
                    this.activeLayer = layerName;
                    // Update layer buttons
                    document.querySelectorAll('.layer-tab').forEach(layerTab => {
                        layerTab.classList.toggle('active', layerTab.dataset.layer === layerName);
                    });
                    // Update secondary tabs
                    const secondaryLayer = document.querySelector('.secondary-layer');
                    if (secondaryLayer) {
                        secondaryLayer.innerHTML = this.tabLayers[layerName].map(tab => 
                            `<button class="menu-tab ${tab === this.activeTab ? 'active' : ''}" data-tab="${tab}">
                                ${this.getTabDisplayName(tab)}
                            </button>`
                        ).join('');
                        // Re-attach event listeners
                        secondaryLayer.querySelectorAll('.menu-tab').forEach(tab => {
                            tab.addEventListener('click', (e) => {
                                this.switchTab(e.target.dataset.tab);
                            });
                        });
                    }
                }
                break;
            }
        }
    },

    switchLayer(layerName) {
        if (!this.tabLayers[layerName]) return;
        
        this.activeLayer = layerName;
        
        // Update layer buttons
        document.querySelectorAll('.layer-tab').forEach(layerTab => {
            layerTab.classList.toggle('active', layerTab.dataset.layer === layerName);
        });
        
        // Update secondary tabs display
        const secondaryLayer = document.querySelector('.secondary-layer');
        if (secondaryLayer) {
            secondaryLayer.innerHTML = this.tabLayers[layerName].map(tab => 
                `<button class="menu-tab ${tab === this.activeTab ? 'active' : ''}" data-tab="${tab}">
                    ${this.getTabDisplayName(tab)}
                </button>`
            ).join('');
            
            // Re-attach event listeners for new tab buttons
            secondaryLayer.querySelectorAll('.menu-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    this.switchTab(e.target.dataset.tab);
                });
            });
        }
        
        // If current active tab is not in the new layer, switch to first tab of new layer
        if (!this.tabLayers[layerName].includes(this.activeTab)) {
            this.switchTab(this.tabLayers[layerName][0]);
        }
    },
    
    switchTab(tabName) {
        this.activeTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.menu-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('hidden', !content.id.startsWith(tabName));
        });
        
        // Special handling for map tab
        if (tabName === 'map') {
            this.populateMapSelectors();
            this.startMapRefresh();
        } else {
            this.stopMapRefresh();
        }
        // Render skills when opened
        if (tabName === 'skills') {
            this.renderSkillsUI();
        }
    },

    populateMapSelectors() {
        const mapSel = document.getElementById('mapSelect');
        const citySel = document.getElementById('citySelect');
        if (!mapSel || !citySel) return;
        const maps = (window.MAPS) ? Object.values(window.MAPS) : [{ id: 'map1', name: 'Map 1' }];
        const currentId = (typeof window.getCurrentMapId==='function') ? window.getCurrentMapId() : 'map1';
        mapSel.innerHTML = maps.map(m => `<option value="${m.id}" ${m.id===currentId?'selected':''}>${m.name||m.id}</option>`).join('');
        const def = window.MAPS && window.MAPS[currentId];
        const cities = def ? def.cities : (window.CITIES||[]);
        citySel.innerHTML = (cities||[]).map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        mapSel.onchange = () => {
            const id = mapSel.value;
            const d = window.MAPS && window.MAPS[id];
            citySel.innerHTML = (d && d.cities ? d.cities : []).map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        };
        const goBtn = document.getElementById('gotoCityBtn');
        if (goBtn) {
            goBtn.onclick = () => {
                const id = mapSel.value; const city = citySel.value;
                if (typeof window.switchToMapAtCity === 'function') window.switchToMapAtCity(id, city);
            };
        }
    },
    
    closeMenu() {
        this.isOpen = false;
        document.getElementById('gameMenu').classList.add('hidden');
        
        if (!window.isMobile) {
            document.body.style.cursor = 'none';
        }
        
        if (window.gameState) {
            window.gameState.paused = false;
        }
    },
    
    savePlayerData() {
        if (this.playerData && this.playerData.isGuest) return; // do not persist guest data
        localStorage.setItem('playerData', JSON.stringify(this.playerData));
    },
    
    loadPlayerData() {
        const saved = localStorage.getItem('playerData');
        if (saved) {
            this.playerData = { ...this.playerData, ...JSON.parse(saved) };
            this.updateInventoryDisplay();
            this.updateCharacterDisplay();
            this.updateEquipmentSlots();
        }
        // Ensure a primary weapon is equipped if present
        if (!this.playerData.equipment.weapon) {
            const hasBasic = this.playerData.inventory.find(i => i.id === 'basic_weapon');
            if (hasBasic) {
                this.equipItem('basic_weapon', 'weapon');
                if (!this.playerData.isGuest) this.savePlayerData();
            }
        }
    },
    
    // Public API for game integration
    addItem(itemId, count = 1) {
        const existingItem = this.playerData.inventory.find(i => i.id === itemId);
        if (existingItem) {
            existingItem.count += count;
        } else {
            // Add new item (would need item database)
            this.playerData.inventory.push({
                id: itemId,
                name: itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                count: count,
                weight: 1,
                type: 'material'
            });
        }
        this.updateInventoryDisplay();
        this.savePlayerData();
    },
    
    removeItem(itemId, count = 1) {
        const item = this.playerData.inventory.find(i => i.id === itemId);
        if (item) {
            item.count -= count;
            if (item.count <= 0) {
                const index = this.playerData.inventory.indexOf(item);
                this.playerData.inventory.splice(index, 1);
            }
            this.updateInventoryDisplay();
            this.savePlayerData();
        }
    },
    
    hasItem(itemId, count = 1) {
        const item = this.playerData.inventory.find(i => i.id === itemId);
        return item && item.count >= count;
    },

    renderWorldMap() {
        const canvas = document.getElementById('world-map');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#000022';
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        ctx.strokeStyle = '#003366';
        ctx.lineWidth = 1;
        const gridSize = 20;
        for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Map scale: 1 pixel = 10 world units
        const scale = 0.1;
        const centerX = width / 2;
        const centerZ = height / 2;
        
        // Draw distance rings
        ctx.strokeStyle = '#004488';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([5, 5]);
        [200, 400, 600, 800, 1000].forEach(distance => {
            ctx.beginPath();
            ctx.arc(centerX, centerZ, distance * scale, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.setLineDash([]);
        
        // Draw cities
        if (window.CITIES) {
            window.CITIES.forEach(city => {
                const mapX = centerX + city.x * scale;
                const mapZ = centerZ + city.z * scale;
                const cityRadius = (city.radius || city.size) * scale;
                
                // City area with gradient
                const gradient = ctx.createRadialGradient(mapX, mapZ, 0, mapX, mapZ, cityRadius);
                gradient.addColorStop(0, 'rgba(0, 255, 255, 0.4)');
                gradient.addColorStop(1, 'rgba(0, 255, 255, 0.1)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(mapX, mapZ, cityRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // City border
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(mapX, mapZ, cityRadius, 0, Math.PI * 2);
                ctx.stroke();
                
                // City center marker
                ctx.fillStyle = '#00ffff';
                ctx.beginPath();
                ctx.arc(mapX, mapZ, 5, 0, Math.PI * 2);
                ctx.fill();
                
                // City name with background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(mapX - 40, mapZ - 25, 80, 15);
                ctx.fillStyle = '#00ffff';
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(city.name, mapX, mapZ - 15);
                
                // Distance from player
                if (window.player && window.player.position) {
                    const distance = Math.sqrt(
                        Math.pow(city.x - window.player.position.x, 2) + 
                        Math.pow(city.z - window.player.position.z, 2)
                    );
                    ctx.font = '10px monospace';
                    ctx.fillStyle = '#88ccff';
                    ctx.fillText(`${Math.round(distance)}m`, mapX, mapZ + 20);
                }
            });
        }
        
        // Draw roads
        if (window.CITY_ROADS && window.CITY_ROADS.length) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            window.CITY_ROADS.forEach(road => {
                const x1 = centerX + road.x1 * scale;
                const z1 = centerZ + road.z1 * scale;
                const x2 = centerX + road.x2 * scale;
                const z2 = centerZ + road.z2 * scale;
                ctx.beginPath();
                ctx.moveTo(x1, z1);
                ctx.lineTo(x2, z2);
                ctx.stroke();
            });
        }
        
        // Draw player position with direction indicator
        if (window.player && window.player.position) {
            const playerX = centerX + window.player.position.x * scale;
            const playerZ = centerZ + window.player.position.z * scale;
            
            // Player direction (if available)
            if (window.facingDirection !== undefined) {
                ctx.strokeStyle = '#ff6666';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(playerX, playerZ);
                ctx.lineTo(
                    playerX + Math.sin(window.facingDirection) * 15,
                    playerZ + Math.cos(window.facingDirection) * 15
                );
                ctx.stroke();
            }
            
            // Player marker with glow
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(playerX, playerZ, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Player label
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(playerX - 20, playerZ - 20, 40, 12);
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('YOU', playerX, playerZ - 10);
            
            // Player coordinates
            ctx.fillStyle = '#ffaaaa';
            ctx.font = '9px monospace';
            ctx.fillText(`(${Math.round(window.player.position.x)}, ${Math.round(window.player.position.z)})`, playerX, playerZ + 15);
        }
        
        // Draw spawn point (origin)
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(centerX, centerZ, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Spawn label
        ctx.fillStyle = '#00ff00';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SPAWN', centerX, centerZ - 10);
        
        // Draw compass
        ctx.save();
        ctx.translate(width - 40, 40);
        
        // Compass circle
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.stroke();
        
        // North indicator
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('N', 0, -15);
        
        // Other directions
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText('E', 15, 0);
        ctx.fillText('S', 0, 15);
        ctx.fillText('W', -15, 0);
        
        ctx.restore();
        
        // Map scale indicator
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Scale: 1px = 10 units', 10, height - 10);
        
        // Draw scale bar
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(10, height - 25);
        ctx.lineTo(110, height - 25);
        ctx.stroke();
        
        // Scale bar ticks
        ctx.beginPath();
        ctx.moveTo(10, height - 30);
        ctx.lineTo(10, height - 20);
        ctx.moveTo(110, height - 30);
        ctx.lineTo(110, height - 20);
        ctx.stroke();
        
        ctx.fillText('0', 8, height - 35);
        ctx.fillText('1000', 95, height - 35);
    },

    updateBlueprints() {
        const grid = document.getElementById('blueprint-grid');
        const preview = document.getElementById('blueprint-preview');
        if (!grid || !preview) return;
        grid.innerHTML = '';
        const bp = this.playerData.blueprints || {};
        const known = Object.entries(bp).filter(([k,v])=>v).map(([k])=>k);
        const getBuild = (k) => {
            const cs = (window.combatSystem && window.combatSystem.BUILDINGS) ? window.combatSystem.BUILDINGS : (typeof BUILDINGS !== 'undefined' ? BUILDINGS : null);
            return cs ? cs[k] : null;
        };
        known.forEach((key) => {
            const build = getBuild(key);
            if (!build) return;
            const item = document.createElement('div');
            item.className = 'bp-item';
            item.dataset.bp = key;
            item.innerHTML = `<div class="bp-name">${build.name}</div>`;
            item.addEventListener('click', () => {
                document.querySelectorAll('#blueprint-grid .bp-item').forEach(b=>b.classList.toggle('active', b.dataset.bp===key));
                const build = getBuild(key);
                if (!build) {
                    preview.innerHTML = '<div class="bp-details">No data</div>';
                    return;
                }
                const costHtml = Object.entries(build.cost||{}).map(([r,a])=>`<div>${r}: ${a}</div>`).join('');
                preview.innerHTML = `
                    <div class="bp-title">${build.name}</div>
                    <div class="bp-desc">${build.description||''}</div>
                    <div class="bp-cost"><b>Cost</b>${costHtml||'<div>None</div>'}</div>
                `;
                this.playerData.activeBlueprint = key;
                window.combatSystem.combatState.playerStats.selectedBuilding = key;
                if (window.combatSystem && window.combatSystem.updateSelectedBuilding) {
                    window.combatSystem.updateSelectedBuilding();
                }
            });
            grid.appendChild(item);
        });
        const initial = this.playerData.activeBlueprint && bp[this.playerData.activeBlueprint] ? this.playerData.activeBlueprint : known[0];
        const first = grid.querySelector(`[data-bp="${initial}"]`) || grid.firstChild;
        if (first) first.click();

        // Populate Bluetooth blueprint store
        const store = document.getElementById('bpList');
        if (store) {
            const all = Object.keys(window.combatSystem.BUILDINGS||{});
            const locked = all.filter(k => !bp[k]);
            store.innerHTML = locked.slice(0, 15).map(k => {
                const b = (window.combatSystem.BUILDINGS||{})[k];
                const price = 100 + Math.floor(((b.integrity||100) + (b.damage||0) + (b.range||0)) * 1.2);
                return `<div data-k="${k}" style="display:flex;justify-content:space-between;align-items:center;margin:3px 0;border-bottom:1px solid #003355;padding:4px 0;">
                    <span>${b.name}</span>
                    <button data-buy="${k}">Buy (${price}C)</button>
                </div>`;
            }).join('');
            store.addEventListener('click', (e)=>{
                const btn = e.target; if (!btn || btn.tagName!=='BUTTON' || !btn.getAttribute('data-buy')) return;
                const k = btn.getAttribute('data-buy');
                const b = (window.combatSystem.BUILDINGS||{})[k];
                const price = 100 + Math.floor(((b.integrity||100) + (b.damage||0) + (b.range||0)) * 1.2);
                // Spend Credits locally (client-trust for prototype)
                // For proper server-side, add endpoint to deduct credits & persist blueprint unlock
                const creditsText = document.getElementById('menu-credits')?.textContent||'';
                const match = creditsText.match(/(\d+)/); const cur = match ? parseInt(match[1],10) : 0;
                if (cur < price) { this.showNotification('Not enough Credits'); return; }
                try { if (window.__updateCreditsHUD) window.__updateCreditsHUD(cur - price); } catch(_){ }
                // Unlock blueprint
                this.playerData.blueprints[k] = true; this.savePlayerData();
                this.updateBlueprints();
                this.showNotification(`${b.name} blueprint unlocked`);
            });
        }
    },

    setupFriendsAndChat() {
        const friendsList = document.getElementById('friendsList');
        const invitesList = document.getElementById('invitesList');
        const onlineSpan = document.getElementById('onlineUsers');
        const friendNameInput = document.getElementById('friendNameInput');
        const sendInviteBtn = document.getElementById('sendInviteBtn');
        const chatLog = document.getElementById('chatLog');
        const chatToInput = document.getElementById('chatToInput');
        const chatMsgInput = document.getElementById('chatMsgInput');
        const chatSendBtn = document.getElementById('chatSendBtn');
        if (!friendsList || !invitesList || !chatLog) return;

        function appendChatLine(html) {
            const div = document.createElement('div');
            div.innerHTML = html;
            chatLog.appendChild(div);
            chatLog.scrollTop = chatLog.scrollHeight;
        }

        // Emitters
        if (sendInviteBtn) {
            sendInviteBtn.onclick = () => {
                const to = (friendNameInput.value||'').trim();
                if (!to || !window.socket) return;
                window.socket.emit('friendRequest', { to });
                friendNameInput.value = '';
            };
        }
        if (chatSendBtn) {
            chatSendBtn.onclick = () => {
                const to = (chatToInput.value||'').trim();
                const text = (chatMsgInput.value||'').trim();
                if (!text || !window.socket) return;
                if (to) { window.socket.emit('chatDM', { to, text }); }
                else { window.socket.emit('chatMessage', { text }); }
                chatMsgInput.value = '';
            };
        }

        // List render helpers
        const renderFriends = (arr) => {
            friendsList.innerHTML = (arr||[]).map(n => `<li>${n}</li>`).join('');
        };
        const renderInvites = (arr) => {
            invitesList.innerHTML = '';
            (arr||[]).forEach(from => {
                const li = document.createElement('li');
                li.textContent = from + ' ';
                const accept = document.createElement('button'); accept.textContent = 'Accept'; accept.style.marginLeft = '6px';
                const decline = document.createElement('button'); decline.textContent = 'Decline'; decline.style.marginLeft = '6px';
                accept.onclick = () => { window.socket && window.socket.emit('friendRespond', { from, accept: true }); };
                decline.onclick = () => { window.socket && window.socket.emit('friendRespond', { from, accept: false }); };
                li.appendChild(accept); li.appendChild(decline);
                invitesList.appendChild(li);
            });
        };

        // Socket listeners (idempotent-ish)
        function ensureSocketListeners() {
            if (!window.socket) return;
            if (window.__friendsChatWired) return;
            window.__friendsChatWired = true;
            window.socket.on('socialData', ({ friends, invites }) => { renderFriends(friends); renderInvites(invites); });
            window.socket.on('onlineUsers', (list) => { if (onlineSpan) onlineSpan.textContent = list.join(', '); });
            window.socket.on('friendRequest', ({ from }) => { appendChatLine(`<span style="color:#88ff88">Friend request from ${from}</span>`); window.socket.emit('requestSocialData'); });
            window.socket.on('friendAdded', ({ friend }) => { appendChatLine(`<span style="color:#88ff88">You are now friends with ${friend}</span>`); window.socket.emit('requestSocialData'); });
            window.socket.on('friendDeclined', ({ by }) => { appendChatLine(`<span style="color:#ffaa88">${by} declined your request</span>`); window.socket.emit('requestSocialData'); });

            window.socket.on('chatMessage', ({ from, text }) => { appendChatLine(`<b>${from}:</b> ${text}`); });
            window.socket.on('chatDM', ({ from, text, echo }) => { appendChatLine(`<b>[DM] ${from}${echo?' (you)':''}:</b> ${text}`); });
            window.socket.on('chatSystem', ({ text }) => { appendChatLine(`<i>${text}</i>`); });
            // Initial populate
            window.socket.emit('requestSocialData');
        }

        ensureSocketListeners();
    },

    setupEconomyUI() {
        const econCredits = document.getElementById('econCredits');
        const econItems = document.getElementById('econItems');
        const menuCredits = document.getElementById('menu-credits');
        const tradeTo = document.getElementById('tradeToInput');
        const tradeReq = document.getElementById('btnTradeReq');
        const tradeOffer = document.getElementById('btnTradeOffer');
        const tradeItemId = document.getElementById('tradeItemId');
        const tradeCreditsOffer = document.getElementById('tradeCreditsOffer');
        const self = this;
        function renderItems(items){
            if (!econItems) return;
            econItems.innerHTML = (items||[]).map(it => `<div>(${it.id}) ${it.name} <span style="opacity:.7">[${it.template}]</span></div>`).join('');
        }
        function onEconomy({ credits, items }){
            if (econCredits) econCredits.textContent = `Credits: ${credits||0}`;
            if (menuCredits) menuCredits.textContent = `Credits: ${credits||0}`;
            renderItems(items);
            // Sync into local inventory for equipping
            try {
                const inv = self.playerData.inventory;
                (items||[]).forEach(it => {
                    const key = `econ_${it.id}`;
                    if (!inv.find(i => i.id === key)) {
                        inv.push({ id: key, name: it.name, count: 1, weight: 4, type: 'weapon', equipped: false, __econ: it });
                    }
                });
                self.updateInventoryDisplay();
            } catch(_){ }
            try { window.menuSystem && window.menuSystem.updateMenuSummary(); } catch(_){}
        }
        if (window.socket) {
            window.socket.on('economyState', onEconomy);
            window.socket.emit('requestEconomy');
        }
        if (tradeReq) tradeReq.onclick = ()=>{ const to=(tradeTo.value||'').trim(); if (to && window.socket) window.socket.emit('tradeRequest', { to }); };
        if (tradeOffer) tradeOffer.onclick = ()=>{ const to=(tradeTo.value||'').trim(); const itemId=(tradeItemId.value||'').trim(); const credits=Number(tradeCreditsOffer.value)||0; if (to && itemId && credits>=0 && window.socket) window.socket.emit('tradeProposal', { to, itemId, credits }); };
    },
    updateMenuSummary() {
        try {
            const s = this.playerData.stats;
            const lvl = document.getElementById('sum-level');
            const xp = document.getElementById('sum-xp');
            const si = document.getElementById('sum-int');
            const sc = document.getElementById('sum-chg');
            const sw = document.getElementById('sum-weight');
            const xpText = `${this.playerData.experience}/${this.playerData.experienceToNext}`;
            if (lvl) lvl.textContent = `Lv ${this.playerData.level}`;
            if (xp) xp.textContent = xpText;
            if (si) si.textContent = `INT ${Math.round(s.integrity)}/${s.maxIntegrity}`;
            if (sc) sc.textContent = `CHG ${Math.round(s.charge)}/${s.maxCharge}`;
            if (sw) sw.textContent = `W ${this.playerData.weight.toFixed(0)}/${this.playerData.maxWeight}`;
        } catch(_){}
    }
};

// Export for use in main.js
window.menuSystem = menuSystem; 