# Remote Deployment Notes (RDN)

## Server Information
- **Remote Server IP**: 178.156.186.132
- **Port**: 8080 (web port - use 80 in production with reverse proxy)
- **Landing Page**: http://178.156.186.132:8080

## Deployment Instructions

### 1. Server Setup
The game server runs on Node.js with Express and Socket.IO for real-time multiplayer functionality.

### 2. Port Configuration
- Default port: 8080 (development)
- Production port: 80 (requires root or reverse proxy)
- Can be overridden with environment variable: `PORT=8080 node server.js`

### 3. Dependencies
Install required packages:
```bash
npm install
```

### 4. Starting the Server
```bash
# Standard start (port 8080)
node server.js

# With specific port
PORT=8080 node server.js

# Background process
nohup node server.js > server.log 2>&1 &

# Production with port 80 (requires root)
sudo PORT=80 /usr/bin/node server.js
```

### 5. Server Features
- Static file serving from `/public` directory
- Real-time multiplayer with Socket.IO
- Game state persistence
- Social features (friends, chat)
- Economy system
- World map and city management

### 6. File Structure
- `server.js` - Main server file
- `public/` - Client-side files (HTML, CSS, JS)
- `world.json` - World data
- `economy.json` - Economy configuration

### 7. Access URLs
- **Production**: http://178.156.186.132:8080 (or http://178.156.186.132 if using port 80)
- **Local Development**: http://localhost:8080

## Recent Updates
- Fixed mobile menu usability issues
- Improved fullscreen mode compatibility
- Enhanced touch controls for mobile devices
- Optimized button layout and scrolling