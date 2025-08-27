#!/bin/bash

# Deployment script for menu system overhaul
# Server: 178.156.186.132
# User: root
# Password: jhcs2bkbH4uf75OP

echo "🚀 Deploying menu system overhaul to server..."

# Check if server is reachable
echo "📡 Testing server connectivity..."
if ! timeout 10 ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@178.156.186.132 "echo 'Server reachable'"; then
    echo "❌ Cannot connect to server. Please check:"
    echo "   - Server is running"
    echo "   - Network connectivity"
    echo "   - SSH service is active"
    echo ""
    echo "Manual deployment instructions:"
    echo "1. Connect to server: ssh root@178.156.186.132"
    echo "2. Navigate to web directory: cd /var/www/html/public/"
    echo "3. Backup current files: cp menu.js menu.js.backup && cp menu.css menu.css.backup"
    echo "4. Upload new files from this directory:"
    echo "   - public/menu.js"
    echo "   - public/menu.css"
    echo "5. Restart web server if needed: systemctl restart nginx"
    exit 1
fi

echo "✅ Server is reachable"

# Create backup of current files
echo "💾 Creating backup of current files..."
ssh root@178.156.186.132 "cd /var/www/html/public && cp menu.js menu.js.backup.$(date +%Y%m%d_%H%M%S) && cp menu.css menu.css.backup.$(date +%Y%m%d_%H%M%S)"

# Deploy new files
echo "📤 Uploading new menu files..."
scp public/menu.js root@178.156.186.132:/var/www/html/public/
scp public/menu.css root@178.156.186.132:/var/www/html/public/

# Verify deployment
echo "🔍 Verifying deployment..."
ssh root@178.156.186.132 "cd /var/www/html/public && ls -la menu.js menu.css"

# Optional: Restart web server
echo "🔄 Restarting web server..."
ssh root@178.156.186.132 "systemctl restart nginx || systemctl restart apache2 || echo 'Could not restart web server - may need manual restart'"

echo "✅ Deployment complete!"
echo "🌐 Your updated menu system should now be live at the server"
echo ""
echo "🎮 New features deployed:"
echo "   - Icon-based navigation with abbreviations"
echo "   - Integrated craft system in main menu"
echo "   - Enhanced keyboard shortcuts (1-9, 0 for tabs)"
echo "   - Improved mobile responsiveness"
echo "   - Better visual design with gradients and shadows"
echo "   - Comprehensive help section"