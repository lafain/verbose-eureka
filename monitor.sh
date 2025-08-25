#!/bin/bash

# Server details
SERVER_IP="178.156.186.132"
PASSWORD="jhcs2bkbH4uf75OP"

echo "=== FAILURE_TO_DIE Server Monitor ==="
echo "Checking server health..."

# Test external access
HTTP_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://$SERVER_IP:3000)

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Server is healthy - HTTP 200 OK"
    echo "🌐 Game accessible at: http://$SERVER_IP:3000"
    echo "⏰ Check time: $(date)"
else
    echo "❌ Server may be down - HTTP Status: $HTTP_STATUS"
    echo "🔄 Attempting to restart server..."
    
    expect << EOF
    spawn ssh -o StrictHostKeyChecking=no root@$SERVER_IP
    expect "password:"
    send "$PASSWORD\r"
    expect "#"
    
    # Kill existing Node.js processes
    send "pkill -f node\r"
    expect "#"
    
    # Wait a moment
    send "sleep 2\r"
    expect "#"
    
    # Navigate to game directory and restart
    send "cd /root/ftd-game && nohup node server.js > game.log 2>&1 &\r"
    expect "#"
    
    # Wait for server to start
    send "sleep 5\r"
    expect "#"
    
    # Check if it's running
    send "ps aux | grep node | grep -v grep\r"
    expect "#"
    
    # Test local access
    send "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000\r"
    expect "#"
    
    send "exit\r"
    expect eof
EOF

    # Test external access again
    sleep 3
    NEW_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://$SERVER_IP:3000)
    if [ "$NEW_STATUS" = "200" ]; then
        echo "✅ Server restarted successfully!"
    else
        echo "❌ Server restart failed - Status: $NEW_STATUS"
    fi
fi

echo ""
echo "=== Quick Access Commands ==="
echo "🌐 Open game: http://$SERVER_IP:3000"
echo "📊 Check status: ./status_check.sh"
echo "🔄 Restart server: ./monitor.sh"
echo "📝 View logs: ssh root@$SERVER_IP 'cd /root/ftd-game && tail -f game.log'"