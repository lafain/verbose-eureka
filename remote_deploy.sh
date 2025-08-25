#!/bin/bash

# Remote deployment script for Caves of Callisto
# This script will connect to the remote server and deploy the game

SERVER_IP="178.156.186.132"
USERNAME="root"
PASSWORD="jhcs2bkbH4uf75OP"

echo "=== Connecting to remote server and deploying Caves of Callisto ==="

# Create a temporary script to run on the remote server
cat > /tmp/remote_setup.sh << 'EOF'
#!/bin/bash

echo "=== Remote Server Setup ==="

# Stop any existing game servers
echo "Stopping existing game servers..."
pkill -f "python.*server.py" || true
pkill -f "node.*server" || true
pkill -f "php.*server" || true
pkill -f "game" || true

# Clean up old files
echo "Cleaning up old files..."
rm -rf /var/www/html/*
rm -rf /tmp/game_files

# Create web directory
mkdir -p /var/www/html

# Check if Apache/Nginx is installed and running
if command -v apache2 &> /dev/null; then
    echo "Apache detected, starting service..."
    systemctl start apache2 || true
    systemctl enable apache2 || true
elif command -v nginx &> /dev/null; then
    echo "Nginx detected, starting service..."
    systemctl start nginx || true
    systemctl enable nginx || true
else
    echo "No web server detected, installing Apache..."
    apt update
    apt install -y apache2
    systemctl start apache2
    systemctl enable apache2
fi

echo "=== Setup Complete ==="
EOF

# Use sshpass to connect and run the setup script
if command -v sshpass &> /dev/null; then
    echo "Using sshpass for automated connection..."
    sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no /tmp/remote_setup.sh $USERNAME@$SERVER_IP:/tmp/
    sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $USERNAME@$SERVER_IP "chmod +x /tmp/remote_setup.sh && /tmp/remote_setup.sh"
    
    # Copy game files
    echo "Copying game files to remote server..."
    sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no index.html $USERNAME@$SERVER_IP:/var/www/html/
    sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no styles.css $USERNAME@$SERVER_IP:/var/www/html/
    sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no game.js $USERNAME@$SERVER_IP:/var/www/html/
    sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no README.md $USERNAME@$SERVER_IP:/var/www/html/
    
    # Set permissions
    sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $USERNAME@$SERVER_IP "chmod 644 /var/www/html/* && chown -R www-data:www-data /var/www/html/"
    
    echo "=== Deployment Complete ==="
    echo "Game is now available at: http://$SERVER_IP/"
    
else
    echo "sshpass not found. Please install it or run the commands manually:"
    echo "1. Install sshpass: sudo apt install sshpass"
    echo "2. Run this script again"
    echo ""
    echo "Or manually connect to the server:"
    echo "ssh root@$SERVER_IP"
    echo "Password: $PASSWORD"
fi

# Clean up
rm -f /tmp/remote_setup.sh