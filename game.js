class CavesOfCallisto {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 20;
        this.mapWidth = 40;
        this.mapHeight = 30;
        this.player = null;
        this.enemies = [];
        this.items = [];
        this.level = 1;
        this.score = 0;
        this.gameState = 'menu'; // menu, playing, gameOver
        this.selectedClass = null;
        this.turnCount = 0;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.showStartScreen();
    }
    
    setupEventListeners() {
        // Movement controls
        document.getElementById('move-up').addEventListener('click', () => this.movePlayer(0, -1));
        document.getElementById('move-down').addEventListener('click', () => this.movePlayer(0, 1));
        document.getElementById('move-left').addEventListener('click', () => this.movePlayer(-1, 0));
        document.getElementById('move-right').addEventListener('click', () => this.movePlayer(1, 0));
        
        // Action buttons
        document.getElementById('attack').addEventListener('click', () => this.playerAttack());
        document.getElementById('wait').addEventListener('click', () => this.playerWait());
        document.getElementById('use-item').addEventListener('click', () => this.useItem());
        
        // Class selection
        document.querySelectorAll('.class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectClass(e.target.dataset.class));
        });
        
        // Start game
        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        
        // Restart game
        document.getElementById('restart').addEventListener('click', () => this.restartGame());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }
    
    selectClass(className) {
        this.selectedClass = className;
        document.querySelectorAll('.class-btn').forEach(btn => btn.classList.remove('selected'));
        document.querySelector(`[data-class="${className}"]`).classList.add('selected');
        document.getElementById('start-game').disabled = false;
    }
    
    showStartScreen() {
        document.getElementById('start-screen').classList.remove('hidden');
        document.getElementById('game-over').classList.add('hidden');
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('start-screen').classList.add('hidden');
        this.generateLevel();
        this.render();
    }
    
    generateLevel() {
        this.map = this.generateMap();
        this.placePlayer();
        this.placeEnemies();
        this.placeItems();
        this.updateUI();
    }
    
    generateMap() {
        const map = [];
        for (let y = 0; y < this.mapHeight; y++) {
            map[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                // Generate walls and floors using simple algorithm
                if (x === 0 || x === this.mapWidth - 1 || y === 0 || y === this.mapHeight - 1) {
                    map[y][x] = 1; // Wall
                } else if (Math.random() < 0.1) {
                    map[y][x] = 1; // Random wall
                } else {
                    map[y][x] = 0; // Floor
                }
            }
        }
        return map;
    }
    
    placePlayer() {
        let x, y;
        do {
            x = Math.floor(Math.random() * (this.mapWidth - 2)) + 1;
            y = Math.floor(Math.random() * (this.mapHeight - 2)) + 1;
        } while (this.map[y][x] !== 0);
        
        this.player = {
            x: x,
            y: y,
            health: 100,
            maxHealth: 100,
            attack: this.getPlayerStats().attack,
            defense: this.getPlayerStats().defense,
            inventory: [],
            class: this.selectedClass
        };
    }
    
    getPlayerStats() {
        switch (this.selectedClass) {
            case 'scout':
                return { attack: 15, defense: 5, health: 80 };
            case 'soldier':
                return { attack: 20, defense: 15, health: 120 };
            case 'scientist':
                return { attack: 10, defense: 10, health: 90 };
            default:
                return { attack: 15, defense: 10, health: 100 };
        }
    }
    
    placeEnemies() {
        this.enemies = [];
        const enemyCount = Math.floor(Math.random() * 5) + 3 + this.level;
        
        for (let i = 0; i < enemyCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * (this.mapWidth - 2)) + 1;
                y = Math.floor(Math.random() * (this.mapHeight - 2)) + 1;
            } while (this.map[y][x] !== 0 || this.isPositionOccupied(x, y));
            
            this.enemies.push({
                x: x,
                y: y,
                health: 30 + this.level * 10,
                maxHealth: 30 + this.level * 10,
                attack: 10 + this.level * 2,
                defense: 5 + this.level,
                type: this.getRandomEnemyType()
            });
        }
    }
    
    getRandomEnemyType() {
        const types = ['alien', 'robot', 'mutant'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    placeItems() {
        this.items = [];
        const itemCount = Math.floor(Math.random() * 3) + 2;
        
        for (let i = 0; i < itemCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * (this.mapWidth - 2)) + 1;
                y = Math.floor(Math.random() * (this.mapHeight - 2)) + 1;
            } while (this.map[y][x] !== 0 || this.isPositionOccupied(x, y));
            
            this.items.push({
                x: x,
                y: y,
                type: this.getRandomItemType()
            });
        }
    }
    
    getRandomItemType() {
        const types = ['health_potion', 'weapon', 'armor', 'artifact'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    isPositionOccupied(x, y) {
        if (this.player && this.player.x === x && this.player.y === y) return true;
        return this.enemies.some(enemy => enemy.x === x && enemy.y === y) ||
               this.items.some(item => item.x === x && item.y === y);
    }
    
    movePlayer(dx, dy) {
        if (this.gameState !== 'playing') return;
        
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        
        if (this.isValidMove(newX, newY)) {
            this.player.x = newX;
            this.player.y = newY;
            this.checkCollisions();
            this.processEnemyTurns();
            this.turnCount++;
            this.updateUI();
            this.render();
        }
    }
    
    isValidMove(x, y) {
        return x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight && this.map[y][x] === 0;
    }
    
    checkCollisions() {
        // Check for item pickup
        const itemIndex = this.items.findIndex(item => item.x === this.player.x && item.y === this.player.y);
        if (itemIndex !== -1) {
            this.pickupItem(itemIndex);
        }
        
        // Check for enemy encounters
        const enemyIndex = this.enemies.findIndex(enemy => enemy.x === this.player.x && enemy.y === this.player.y);
        if (enemyIndex !== -1) {
            this.startCombat(enemyIndex);
        }
    }
    
    pickupItem(itemIndex) {
        const item = this.items[itemIndex];
        this.player.inventory.push(item);
        this.items.splice(itemIndex, 1);
        this.addLogMessage(`Picked up ${item.type}!`, 'item');
        this.score += 10;
    }
    
    startCombat(enemyIndex) {
        const enemy = this.enemies[enemyIndex];
        this.addLogMessage(`Combat with ${enemy.type}!`, 'combat');
        
        // Player attacks first
        const playerDamage = Math.max(1, this.player.attack - enemy.defense);
        enemy.health -= playerDamage;
        this.addLogMessage(`You deal ${playerDamage} damage!`, 'combat');
        
        if (enemy.health <= 0) {
            this.enemies.splice(enemyIndex, 1);
            this.addLogMessage(`Enemy defeated!`, 'combat');
            this.score += 50;
        } else {
            // Enemy counter-attack
            const enemyDamage = Math.max(1, enemy.attack - this.player.defense);
            this.player.health -= enemyDamage;
            this.addLogMessage(`Enemy deals ${enemyDamage} damage!`, 'combat');
            
            if (this.player.health <= 0) {
                this.gameOver();
            }
        }
    }
    
    playerAttack() {
        if (this.gameState !== 'playing') return;
        
        // Find adjacent enemy
        const adjacentEnemy = this.enemies.find(enemy => 
            Math.abs(enemy.x - this.player.x) <= 1 && Math.abs(enemy.y - this.player.y) <= 1
        );
        
        if (adjacentEnemy) {
            const enemyIndex = this.enemies.indexOf(adjacentEnemy);
            this.startCombat(enemyIndex);
        } else {
            this.addLogMessage("No enemy in range!", 'info');
        }
        
        this.processEnemyTurns();
        this.turnCount++;
        this.updateUI();
        this.render();
    }
    
    playerWait() {
        if (this.gameState !== 'playing') return;
        
        this.addLogMessage("You wait...", 'info');
        this.processEnemyTurns();
        this.turnCount++;
        this.updateUI();
        this.render();
    }
    
    useItem() {
        if (this.gameState !== 'playing' || this.player.inventory.length === 0) return;
        
        const item = this.player.inventory.pop();
        this.applyItemEffect(item);
        this.addLogMessage(`Used ${item.type}!`, 'item');
        this.updateInventory();
    }
    
    applyItemEffect(item) {
        switch (item.type) {
            case 'health_potion':
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
                break;
            case 'weapon':
                this.player.attack += 5;
                break;
            case 'armor':
                this.player.defense += 3;
                break;
            case 'artifact':
                this.score += 100;
                break;
        }
    }
    
    processEnemyTurns() {
        this.enemies.forEach(enemy => {
            if (Math.random() < 0.3) { // 30% chance to move
                this.moveEnemy(enemy);
            }
        });
    }
    
    moveEnemy(enemy) {
        const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const newX = enemy.x + direction[0];
        const newY = enemy.y + direction[1];
        
        if (this.isValidMove(newX, newY) && !this.isPositionOccupied(newX, newY)) {
            enemy.x = newX;
            enemy.y = newY;
        }
    }
    
    handleKeyPress(e) {
        if (this.gameState !== 'playing') return;
        
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
                e.preventDefault();
                this.movePlayer(0, -1);
                break;
            case 'ArrowDown':
            case 's':
                e.preventDefault();
                this.movePlayer(0, 1);
                break;
            case 'ArrowLeft':
            case 'a':
                e.preventDefault();
                this.movePlayer(-1, 0);
                break;
            case 'ArrowRight':
            case 'd':
                e.preventDefault();
                this.movePlayer(1, 0);
                break;
            case ' ':
                e.preventDefault();
                this.playerAttack();
                break;
            case 'Enter':
                e.preventDefault();
                this.playerWait();
                break;
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render map
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const screenX = x * this.tileSize;
                const screenY = y * this.tileSize;
                
                if (this.map[y][x] === 1) {
                    this.ctx.fillStyle = '#333';
                    this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                } else {
                    this.ctx.fillStyle = '#111';
                    this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                }
            }
        }
        
        // Render items
        this.items.forEach(item => {
            const screenX = item.x * this.tileSize;
            const screenY = item.y * this.tileSize;
            this.ctx.fillStyle = this.getItemColor(item.type);
            this.ctx.fillRect(screenX + 2, screenY + 2, this.tileSize - 4, this.tileSize - 4);
        });
        
        // Render enemies
        this.enemies.forEach(enemy => {
            const screenX = enemy.x * this.tileSize;
            const screenY = enemy.y * this.tileSize;
            this.ctx.fillStyle = this.getEnemyColor(enemy.type);
            this.ctx.fillRect(screenX + 2, screenY + 2, this.tileSize - 4, this.tileSize - 4);
        });
        
        // Render player
        const playerScreenX = this.player.x * this.tileSize;
        const playerScreenY = this.player.y * this.tileSize;
        this.ctx.fillStyle = '#00ff41';
        this.ctx.fillRect(playerScreenX + 2, playerScreenY + 2, this.tileSize - 4, this.tileSize - 4);
    }
    
    getItemColor(type) {
        switch (type) {
            case 'health_potion': return '#ff4444';
            case 'weapon': return '#ffaa00';
            case 'armor': return '#4444ff';
            case 'artifact': return '#ff00ff';
            default: return '#ffffff';
        }
    }
    
    getEnemyColor(type) {
        switch (type) {
            case 'alien': return '#00ff00';
            case 'robot': return '#888888';
            case 'mutant': return '#ff8800';
            default: return '#ff0000';
        }
    }
    
    updateUI() {
        document.getElementById('level').textContent = `Level: ${this.level}`;
        document.getElementById('health').textContent = `HP: ${this.player.health}/${this.player.maxHealth}`;
        document.getElementById('score').textContent = `Score: ${this.score}`;
        this.updateInventory();
    }
    
    updateInventory() {
        const inventoryDiv = document.getElementById('inventory-items');
        inventoryDiv.innerHTML = '';
        
        this.player.inventory.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.textContent = `${index + 1}. ${item.type}`;
            itemDiv.style.color = this.getItemColor(item.type);
            inventoryDiv.appendChild(itemDiv);
        });
    }
    
    addLogMessage(message, type = 'info') {
        const logDiv = document.getElementById('log-messages');
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.className = `log-entry ${type}`;
        logDiv.appendChild(messageDiv);
        logDiv.scrollTop = logDiv.scrollHeight;
        
        // Keep only last 10 messages
        while (logDiv.children.length > 10) {
            logDiv.removeChild(logDiv.firstChild);
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over').classList.remove('hidden');
    }
    
    restartGame() {
        this.level = 1;
        this.score = 0;
        this.turnCount = 0;
        this.showStartScreen();
    }
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CavesOfCallisto();
});