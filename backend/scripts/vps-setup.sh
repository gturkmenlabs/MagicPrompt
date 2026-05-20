#!/bin/bash
# VPS Manual Deploy Script for Super Reasoning
# Run this on your VPS as root

set -e

echo "=== Super Reasoning VPS Deploy ==="

# 1. Update system
echo "[1/6] Updating system..."
apt-get update -y
apt-get upgrade -y

# 2. Install Docker if not exists
echo "[2/6] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# 3. Install Docker Compose
echo "[3/6] Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 4. Create app directory
echo "[4/6] Creating app directory..."
mkdir -p /opt/super-reasoning
cd /opt/super-reasoning

# 5. Create docker-compose.yml
echo "[5/6] Creating docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  app:
    build: .
    ports:
      - "4000:4000"
    env_file:
      - .env
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
EOF

# 6. Instructions for next steps
echo "[6/6] Setup complete!"
echo ""
echo "Next steps:"
echo "1. Upload project files to /opt/super-reasoning"
echo "   scp -r /local/path/* root@187.77.34.104:/opt/super-reasoning/"
echo ""
echo "2. Create .env file:"
echo "   nano /opt/super-reasoning/.env"
echo ""
echo "3. Build and run:"
echo "   cd /opt/super-reasoning && docker-compose up -d --build"
echo ""
echo "4. Check logs:"
echo "   docker-compose logs -f"
