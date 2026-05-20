#!/bin/bash

# Super Reasoning VPS Deployment Script
# Run this on your VPS (srv1327766.hstgr.cloud - 187.77.34.104)

set -e

echo "🚀 Super Reasoning VPS Deployment Script"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "📦 Docker kuruluyor..."
    apt update
    apt install -y docker.io docker-compose
    systemctl start docker
    systemctl enable docker
    echo "✅ Docker kuruldu"
else
    echo "✅ Docker zaten kurulu"
fi

# Check if SSH key exists
if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "🔑 SSH anahtari olusturuluyor..."
    ssh-keygen -t ed25519 -C "vps@super-reasoning" -f ~/.ssh/id_ed25519 -N ""
    echo "✅ SSH anahtari olusturuldu"
    echo ""
    echo "⚠️  ONEMLI: Asagidaki public anahtari GitHub'a ekleyin:"
    echo ""
    cat ~/.ssh/id_ed25519.pub
    echo ""
    echo "GitHub → Settings → SSH and GPG keys → New SSH key"
    echo "Anahtari ekledikten sonra bu scripti tekrar calistirin"
    exit 1
fi

# Test SSH connection to GitHub
echo "🔍 GitHub baglantisi test ediliyor..."
if ! ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    echo "❌ GitHub SSH baglantisi basarisiz"
    echo "Lutfen SSH anahtarinizi GitHub'a ekleyin:"
    cat ~/.ssh/id_ed25519.pub
    exit 1
fi
echo "✅ GitHub baglantisi successful"

# Clone repository
echo "📥 Repository klonlaniyor..."
if [ -d "super-reasoning" ]; then
    echo "⚠️  super-reasoning klasoru zaten var, guncelleniyor..."
    cd super-reasoning
    git pull
else
    git clone git@github.com:gokhanturkmeen/super-reasoning.git
    cd super-reasoning
fi
echo "✅ Repository ready"

# Build and run with Docker
echo "🐳 Docker container'lari baslatiliyor..."
docker-compose down 2>/dev/null || true
docker-compose up -d --build

# Check status
echo ""
echo "📊 Container durumu:"
docker-compose ps

echo ""
echo "🎉 DAGITIM TAMAMLANDI!"
echo "======================"
echo ""
echo "🌐 Uygulamaniza erisim:"
echo "   http://187.77.34.104:4000"
echo ""
echo "📋 Loglari goruntulemek for:"
echo "   docker-compose logs -f"
echo ""
echo "🔄 Yeniden baslatmak for:"
echo "   docker-compose restart"
