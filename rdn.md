# Remote Deployment Notes (RDN)

## Server Information
- **Remote Server IP**: 178.156.186.132
- **Web Port**: 80 (Apache reverse proxy)
- **Game Server Port**: 8080 (Node.js backend)
- **Landing Page**: http://178.156.186.132
- **Game URL**: http://178.156.186.132/ftd
- **Root Password**: jhcs2bkbH4uf75OP

## Architecture
- **Apache2** serves on port 80 and proxies requests to Node.js
- **Node.js** game server runs on port 8080
- **Socket.IO** WebSocket connections are properly proxied
- **Firewall** allows ports 80 and 8080

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
- **Production Landing**: http://178.156.186.132
- **Production Game**: http://178.156.186.132/ftd
- **Direct Backend**: http://178.156.186.132:8080 (for debugging)
- **Local Development**: http://localhost:8080

### 8. Apache Configuration
The server uses Apache2 as a reverse proxy:
- Apache listens on port 80 (standard web port)
- Proxies all requests to Node.js server on port 8080
- Handles WebSocket connections for Socket.IO
- No port numbers needed for users!

## Recent Updates
- Fixed mobile menu usability issues
- Improved fullscreen mode compatibility
- Enhanced touch controls for mobile devices
- Optimized button layout and scrolling