# FAILURE_TO_DIE Game Server

## Server Information
- **IP Address:** 178.156.186.132
- **Port:** 3000
- **Access URL:** http://178.156.186.132:3000
- **Server Type:** Ubuntu 22.04.5 LTS
- **Game Directory:** `/root/ftd-game/`

## Current Status
✅ **SERVER IS RUNNING** - Game accessible at http://178.156.186.132:3000

## System Resources
- **Memory:** 3.7GB total, 241MB used (9% usage)
- **Disk:** 75GB total, 3.3GB used (5% usage)
- **Uptime:** 8 days, 22 hours
- **Load Average:** 0.10, 0.03, 0.01

## Game Server Details
- **Process ID:** 269588
- **Node.js Version:** 18.x
- **Dependencies:** Express, Socket.IO
- **Background Process:** `nohup node server.js > game.log 2>&1 &`

## Management Commands

### Check Server Status
```bash
./status_check.sh
```

### Monitor Server Health
```bash
./monitor.sh
```

### View Real-time Logs
```bash
ssh root@178.156.186.132 'cd /root/ftd-game && tail -f game.log'
```

### Restart Server
```bash
./monitor.sh
```

### SSH Access
```bash
ssh root@178.156.186.132
# Password: jhcs2bkbH4uf75OP
```

## Game Features
- **Multiplayer Support:** Socket.IO real-time communication
- **World Persistence:** Saves world state to `world.json`
- **Social Features:** Friends system and invites
- **Combat System:** Real-time combat mechanics
- **Building System:** Player construction capabilities
- **Mobile Support:** Touch controls and responsive design

## Security
- **Firewall:** UFW active with port 3000 allowed
- **SSH:** Port 22 open for management
- **Process Isolation:** Running as background process

## Deployment Date
August 25, 2025 - 12:45 UTC

## Notes
- Server runs automatically on boot (nohup)
- Logs are saved to `game.log`
- World state persists between restarts
- External access confirmed working