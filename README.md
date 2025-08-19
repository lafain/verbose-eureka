# Caves of Callisto

A 2D sci-fi roguelike game set on Jupiter's moon Callisto. Explore ancient alien ruins, battle hostile creatures, and discover artifacts in this turn-based adventure.

## Game Features

- **Turn-based Combat**: Strategic combat system with attack and defense mechanics
- **Tile-based Movement**: Classic roguelike movement on a grid
- **Class-based Gameplay**: Choose from Scout, Soldier, or Scientist classes
- **Procedurally Generated Levels**: Each playthrough offers unique challenges
- **Permadeath**: Classic roguelike experience - death is permanent
- **Inventory System**: Collect and use items to enhance your character
- **Multiple Enemy Types**: Face aliens, robots, and mutants
- **Responsive Design**: Playable on desktop and mobile devices

## How to Play

### Controls
- **Movement**: Arrow keys or WASD
- **Attack**: Spacebar or click "Attack" button
- **Wait**: Enter key or click "Wait" button
- **Use Item**: Click "Use Item" button
- **Mouse/Touch**: Click buttons for movement and actions

### Classes

1. **Scout**: High attack, low defense, moderate health
   - Attack: 15, Defense: 5, Health: 80

2. **Soldier**: Balanced stats, high health
   - Attack: 20, Defense: 15, Health: 120

3. **Scientist**: Low attack, balanced defense, moderate health
   - Attack: 10, Defense: 10, Health: 90

### Items

- **Health Potion** (Red): Restores 30 HP
- **Weapon** (Orange): Increases attack by 5
- **Armor** (Blue): Increases defense by 3
- **Artifact** (Purple): Grants 100 points

### Enemies

- **Alien** (Green): Hostile extraterrestrial creatures
- **Robot** (Gray): Mechanical guardians
- **Mutant** (Orange): Bio-engineered threats

## Setup Instructions

### Option 1: Python Server (Recommended)
```bash
python3 server.py
```
Then open http://localhost:8000 in your browser.

### Option 2: Any Web Server
Simply serve the files using any web server:
- Copy all files to your web server directory
- Access index.html through your web server

### Option 3: Direct File Access
Open `index.html` directly in a modern web browser (some features may be limited).

## Game Mechanics

### Combat
- Combat is initiated when you move into an enemy's space
- Player attacks first, then enemy counter-attacks
- Damage = Attacker's Attack - Defender's Defense (minimum 1)
- Defeated enemies grant 50 points

### Movement
- Move one tile at a time
- Cannot move through walls
- Enemies move randomly when it's their turn
- Items are automatically picked up when you move over them

### Scoring
- Picking up items: 10 points
- Defeating enemies: 50 points
- Using artifacts: 100 points

## Technical Details

- **Language**: JavaScript (ES6+)
- **Graphics**: HTML5 Canvas
- **Styling**: CSS3 with responsive design
- **No Dependencies**: Pure vanilla JavaScript
- **Cross-platform**: Works on any modern browser

## Development

The game is built with modular JavaScript classes and follows object-oriented principles. The main game logic is contained in the `CavesOfCallisto` class, which handles:

- Game state management
- Level generation
- Combat mechanics
- UI updates
- Input handling

## Future Enhancements

Potential features for future versions:
- Multiple levels with increasing difficulty
- More enemy types and behaviors
- Advanced item system with equipment slots
- Special abilities for each class
- Sound effects and music
- Save/load functionality
- Multiplayer support

## Credits

Based on the Callisto design document, this game implements the core mechanics described in the original specification while adapting them for web-based play.

---

Enjoy exploring the Caves of Callisto!
