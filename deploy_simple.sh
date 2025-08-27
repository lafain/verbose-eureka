#!/bin/bash

SERVER="178.156.186.132"
PASSWORD="jhcs2bkbH4uf75OP"

echo "🚀 Deploying menu system to server $SERVER..."

# Function to run SSH command with password
run_ssh() {
    local cmd="$1"
    echo "Executing: $cmd"
    
    # Use a here-document to provide password
    ssh -o StrictHostKeyChecking=no root@$SERVER "$cmd" << EOF
$PASSWORD
EOF
}

# Function to copy file with password
copy_file() {
    local src="$1"
    local dst="$2"
    echo "Copying $src to $dst"
    
    scp -o StrictHostKeyChecking=no "$src" root@$SERVER:"$dst" << EOF
$PASSWORD
EOF
}

echo "📋 Step 1: Testing connection..."
run_ssh "echo 'Connection successful'"

echo "📋 Step 2: Creating backup..."
run_ssh "cd /var/www/html/public && cp menu.js menu.js.backup.\$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo 'No existing menu.js'; cp menu.css menu.css.backup.\$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo 'No existing menu.css'"

echo "📋 Step 3: Uploading files..."
copy_file "public/menu.js" "/var/www/html/public/menu.js"
copy_file "public/menu.css" "/var/www/html/public/menu.css"

echo "📋 Step 4: Setting permissions..."
run_ssh "cd /var/www/html/public && chown www-data:www-data menu.js menu.css 2>/dev/null || echo 'Permission change not needed'"

echo "📋 Step 5: Verifying deployment..."
run_ssh "cd /var/www/html/public && ls -la menu.js menu.css"

echo "📋 Step 6: Restarting web server..."
run_ssh "systemctl restart nginx 2>/dev/null || systemctl restart apache2 2>/dev/null || echo 'Web server restart may be needed manually'"

echo "✅ Deployment completed!"
echo "🌐 Menu system should now be live with fullscreen improvements"