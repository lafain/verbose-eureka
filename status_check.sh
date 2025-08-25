#!/bin/bash

# Server details
SERVER_IP="178.156.186.132"
PASSWORD="jhcs2bkbH4uf75OP"

echo "=== FAILURE_TO_DIE Game Server Status Check ==="
echo "Server: $SERVER_IP"
echo "Time: $(date)"
echo ""

expect << EOF
spawn ssh -o StrictHostKeyChecking=no root@$SERVER_IP
expect "password:"
send "$PASSWORD\r"
expect "#"

# Check system resources
send "echo '=== System Resources ==='\r"
expect "#"
send "free -h\r"
expect "#"
send "df -h /\r"
expect "#"
send "uptime\r"
expect "#"

# Check Node.js process
send "echo '=== Node.js Process ==='\r"
expect "#"
send "ps aux | grep node | grep -v grep\r"
expect "#"

# Check port status
send "echo '=== Port Status ==='\r"
expect "#"
send "netstat -tlnp | grep :3000\r"
expect "#"

# Check firewall
send "echo '=== Firewall Status ==='\r"
expect "#"
send "ufw status | grep 3000\r"
expect "#"

# Check game directory
send "echo '=== Game Directory ==='\r"
expect "#"
send "cd /root/ftd-game && ls -la\r"
expect "#"

# Check recent logs
send "echo '=== Recent Logs ==='\r"
expect "#"
send "tail -10 game.log\r"
expect "#"

# Test local access
send "echo '=== Local Access Test ==='\r"
expect "#"
send "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000\r"
expect "#"

# Check for any errors
send "echo '=== Error Check ==='\r"
expect "#"
send "journalctl -u systemd-networkd --since '5 minutes ago' | grep -i error || echo 'No recent network errors'\r"
expect "#"

# Exit SSH
send "exit\r"
expect eof
EOF

echo ""
echo "=== External Access Test ==="
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" http://$SERVER_IP:3000

echo ""
echo "Status check completed at $(date)"