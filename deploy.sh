#!/bin/bash

# Deployment script for FAILURE_TO_DIE game server
# Remote server: 178.156.186.132
# Root password: jhcs2bkbH4uf75OP

REMOTE_IP="178.156.186.132"
REMOTE_USER="root"
REMOTE_PATH="/opt/ftd-game"

echo "=== FAILURE_TO_DIE Deployment Script ==="
echo "Remote server: $REMOTE_IP"
echo "Deploying to: $REMOTE_PATH"
echo ""

# Create deployment package
echo "Creating deployment package..."
tar -czf ftd-deployment.tar.gz \
    server.js \
    package.json \
    package-lock.json \
    world.json \
    economy.json \
    public/ \
    rdn.md \
    --exclude=node_modules \
    --exclude=server.log \
    --exclude=.git

echo "Deployment package created: ftd-deployment.tar.gz"
echo ""

echo "Manual deployment steps:"
echo "1. Copy ftd-deployment.tar.gz to remote server"
echo "2. SSH to remote server: ssh root@$REMOTE_IP"
echo "3. Extract: tar -xzf ftd-deployment.tar.gz -C $REMOTE_PATH"
echo "4. Install dependencies: cd $REMOTE_PATH && npm install"
echo "5. Stop existing server: pkill -f 'node server.js'"
echo "6. Start server: PORT=80 nohup node server.js > server.log 2>&1 &"
echo ""

echo "Or use SCP to copy files:"
echo "scp ftd-deployment.tar.gz root@$REMOTE_IP:$REMOTE_PATH/"
echo ""

echo "Verify deployment at: http://$REMOTE_IP"