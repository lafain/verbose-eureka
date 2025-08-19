#!/bin/bash

# Caves of Callisto Deployment Script
# This script will deploy the game to the remote server

echo "=== Caves of Callisto Deployment ==="

# Check if we're on the remote server
if [ "$(hostname)" = "178.156.186.132" ]; then
    echo "Detected remote server deployment"
    
    # Stop any existing game servers
    echo "Stopping existing game servers..."
    pkill -f "python.*server.py" || true
    pkill -f "node.*server" || true
    pkill -f "php.*server" || true
    
    # Clean up old files
    echo "Cleaning up old files..."
    rm -rf /var/www/html/*
    rm -rf /tmp/game_files
    
    # Create web directory
    mkdir -p /var/www/html
    
    # Copy game files
    echo "Copying game files..."
    cp index.html /var/www/html/
    cp styles.css /var/www/html/
    cp game.js /var/www/html/
    cp README.md /var/www/html/
    
    # Set permissions
    chmod 644 /var/www/html/*
    chown -R www-data:www-data /var/www/html/
    
    # Start web server (Apache/Nginx should already be running)
    echo "Game deployed to web server"
    echo "Access the game at: http://178.156.186.132/"
    
else
    echo "Local deployment detected"
    echo "Starting local development server..."
    python3 server.py
fi

echo "=== Deployment Complete ==="