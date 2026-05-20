# VPS'e Deploy — ready Komutlar

**Hostinger sunucuya deploy (GitHub’siz veya GitHub ile):**  
→ **[deploy/HOSTINGER-SUNUCU-DEPLOY.md](HOSTINGER-SUNUCU-DEPLOY.md)** — tek rehber.

---

## Yerel Gelistirme (AI Lab / RD-Agent dahil)

Tek komutla API + frontend start (tek terminal):

```bash
npm run dev:all
```

- API: http://localhost:4000  
- Web: http://localhost:3000 (veya Vite’in soyledigi port)  
- Durdurmak: **Ctrl+C**

Sadece API veya sadece frontend for:

```bash
npm run api          # Sadece backend (4000)
npm run dev          # Sadece frontend (3000)
```

`.env` dosyasinda en az bir LLM anahtari olmali (orn. `VITE_GROQ_API_KEY`, `GEMINI_API_KEY`) ki AI Lab / RD-Agent calissin.

---

## Secenek 1: Hostinger VPS — GitHub ile (SSH + script)

```bash
ssh root@SUNUCU_IP
apt update && apt install -y git
git clone https://github.com/gokhanturkmeen/super-reasoning.git /opt/super-reasoning
cd /opt/super-reasoning
REPO_URL="https://github.com/gokhanturkmeen/super-reasoning.git" \
DOMAIN="srv1327766.hstgr.cloud" \
bash deploy/setup-vps.sh
```

`DOMAIN` = kendi Hostinger hostname veya domain’iniz. Sonra:  
`nano /opt/super-reasoning/.env` → `systemctl restart super-reasoning`

---

## Secenek 1b: Hostinger VPS — GitHub’siz (ZIP upload)

1. **ZIP olustur (Windows):** proje kokunde `.\deploy\create-deploy-zip.ps1`  
2. **ZIP’i sunucuya upload** (hPanel File Yoneticisi veya SFTP → `/opt`).  
3. **SSH:**  
   `cd /opt && unzip -o super-reasoning_....zip && mv super-reasoning-v3.1-main super-reasoning` (klasor adina gore)  
   `cd /opt/super-reasoning && DOMAIN="srv1327766.hstgr.cloud" bash deploy/setup-vps-no-git.sh`  
4. **.env:** `nano /opt/super-reasoning/.env` → `systemctl restart super-reasoning`

Detay: **[HOSTINGER-SUNUCU-DEPLOY.md](HOSTINGER-SUNUCU-DEPLOY.md)**

---

## Secenek 2: SSH + Docker Compose

VPS’te Docker kuruluysa:

```bash
ssh root@VPS_IP_ADRESINIZ
git clone https://github.com/gokhanturkmeen/super-reasoning.git /opt/super-reasoning
cd /opt/super-reasoning
docker compose up -d --build
```

Uygulama: `http://VPS_IP:4000`  
Firewall’da 4000 portunu acmayi unutmayin.

### Compose komutlarini cesitlendirilmis kullanma (onerilen)

Proje kokunde:

```bash
npm run compose:help
```

Hizli komutlar:

```bash
# Dev DB stack
npm run compose:dev:up
npm run compose:dev:logs
npm run compose:dev:down
npm run compose:dev:reset

# VPS app stack
npm run compose:vps:up
npm run compose:vps:build
npm run compose:vps:logs
npm run compose:vps:down
```

Tek script ile:

```bash
bash scripts/compose-up.sh up dev
bash scripts/compose-up.sh build vps
COMPOSE_TARGET=vps bash scripts/compose-up.sh logs
```

---

## Guncelleme

Kod degisince VPS’te:

```bash
ssh root@VPS_IP "cd /opt/super-reasoning && git pull && (npm run build 2>/dev/null; systemctl restart super-reasoning 2>/dev/null) || (docker compose up -d --build)"
```

Secenek 1 kullandiysaniz sadece:  
`ssh root@VPS_IP "cd /opt/super-reasoning && bash deploy/update-vps.sh"`
