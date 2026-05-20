# Hostinger'a Deploy Adimlari

Uygulama **Vite (React) + Express**; tek process hem API hem frontend sunar.

---

## Method A: Hostinger VPS (SSH) — Onerilen

VPS’iniz varsa tek script ile kurulum yapilir.

### 1. VPS bilgileri

- hPanel → **VPS** → IP, user (genelde `root`), sifre veya SSH key.

### 2. Sunucuya baglanip kurulum

```bash
ssh root@SUNUCU_IP
```

Asagidakileri kendi degerlerinizle degistirip calistirin:

- `REPO_URL`: Projenin Git adresi (GitHub/GitLab).
- `DOMAIN`: Hostinger hostname (orn. `srv1327766.hstgr.cloud`) veya kendi domain.

```bash
apt update && apt install -y git
git clone https://github.com/KULLANICI_ADINIZ/super-reasoning.git /opt/super-reasoning
cd /opt/super-reasoning

REPO_URL="https://github.com/KULLANICI_ADINIZ/super-reasoning.git" \
DOMAIN="srv1327766.hstgr.cloud" \
bash deploy/setup-vps.sh
```

### 3. Ortam degiskenleri

```bash
nano /opt/super-reasoning/.env
```

En az: `GEMINI_API_KEY`, gerekirse `DATABASE_URL`, `STRIPE_*`, `SUPABASE_*` vb. Kaydedip:

```bash
systemctl restart super-reasoning
```

### 4. SSL (istege bagli)

```bash
certbot --nginx -d srv1327766.hstgr.cloud
```

### 5. Guncelleme

Kod degisince VPS’te:

```bash
ssh root@SUNUCU_IP "cd /opt/super-reasoning && bash deploy/update-vps.sh"
```

---

## Method B: Hostinger Node.js Web App (Business/Cloud)

hPanel’de **Node.js** uygulamasi acabiliyorsaniz:

### 1. Deploy zip olusturma (Windows)

Proje kokunde PowerShell:

```powershell
cd d:\super-reasoning-v3.1-main
.\deploy\create-deploy-zip.ps1
```

`dist-deploy` klasorunde `super-reasoning_YYYYMMDD_HHMMSS.zip` olusur.

### 2. hPanel ayarlari

1. **Websites** → **Node.js** → **Create Node.js App** (veya mevcut uygulamayi secin).
2. **Upload** ile yukarida olusan zip’i yukleyin (veya GitHub baglayin).
3. **Build command:** `npm ci && npm run build`
4. **Start command:** `npm start`
5. **Environment variables:** `.env` iceriginizi tek tek ekleyin (GEMINI_API_KEY, DATABASE_URL vb.).
6. Root path: `dist` (veya panelde varsayilan; Express zaten `dist` sunuyor).

Kaydedip deploy’u baslatin.

---

## Kontrol

- Site: `http://SUNUCU_IP` veya `http://srv1327766.hstgr.cloud`
- API: `http://SUNUCU_IP/v1/health`

---

## Hostinger MCP ile otomatik deploy

Cursor’da Hostinger MCP kimlik dogrulandiysa:

1. Deploy zip’i olusturun (yukaridaki PowerShell scripti).
2. MCP’de **deployJsApplication** kullanin; `archivePath` olarak bu zip’in yolunu, `domain` olarak Hostinger’daki domain’i verin.

Su an API “Unauthenticated” donuyorsa once hPanel veya Hostinger API ile hesap baglantisini kontrol edin.
