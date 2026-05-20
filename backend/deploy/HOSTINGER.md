# Hostinger'a Deploy Rehberi

Bu rehber, Super Reasoning projesini **Hostinger VPS** uzerinde calistirmak for adim adim talimatlar icerir.

> Ops Runbook (deploy + SSL + rollback + incident): [OPS-RUNBOOK.md](./OPS-RUNBOOK.md)

---

## Secenek 1: VPS ile SSH (Onerilen)

Hostinger VPS veya KVM VPS satin aldiysaniz, SSH ile sunucuya baglanip tek script ile kurulum yapabilirsiniz.

### Gereksinimler

- Hostinger VPS (Ubuntu 22.04 / 24.04 onerilir)
- SSH erisimi (root veya sudo user)
- Projenin bir Git reposunda olmasi (GitHub/GitLab)

### Adim 1: VPS bilgilerini alin

1. Hostinger hPanel → **VPS** → VPS’inize tiklayin.
2. **SSH erisim** bilgilerini not alin: IP, user (genelde `root`), sifre veya SSH key.
3. Hostname’i not alin (orn. `srv1327766.hstgr.cloud`).

### Adim 2: Ilk SSH baglantisi

```bash
ssh root@SUNUCU_IP
# veya: ssh root@srv1327766.hstgr.cloud
```

### Adim 3: Kurulum scriptini calistirin

**A) Repo’yu sunucuya kopyalayip scripti orada calistirma**

```bash
# Sunucuda
apt update && apt install -y git
git clone https://github.com/KULLANICI_ADINIZ/super-reasoning.git /opt/super-reasoning
cd /opt/super-reasoning
# deploy/setup-vps.sh icindeki REPO_URL ve DOMAIN'i duzenleyin (veya asagidaki gibi env ile verin)
REPO_URL="https://github.com/SIZIN_KULLANICI/super-reasoning.git" \
DOMAIN="srv1327766.hstgr.cloud" \
bash deploy/setup-vps.sh
```

**B) Sadece scripti sunucuya atip, projeyi scriptin icinde klonlatma**

`deploy/setup-vps.sh` icinde su satirlari kendi bilgilerinizle degistirin:

- `REPO_URL` → Kendi GitHub/GitLab repo URL’iniz
- `DOMAIN` → Hostinger hostname’iniz (orn. `srv1327766.hstgr.cloud`) veya kendi domain’iniz

Sonra sunucuda:

```bash
curl -sSL "https://raw.githubusercontent.com/KULLANICI_ADINIZ/super-reasoning/main/deploy/setup-vps.sh" -o setup.sh
chmod +x setup.sh
sudo ./setup.sh
```

Veya scripti elle kopyalayip:

```bash
sudo bash /opt/super-reasoning/deploy/setup-vps.sh
```

### Adim 4: Ortam degiskenleri (.env)

Kurulumdan sonra mutlaka `.env` dosyasini duzenleyin:

```bash
nano /opt/super-reasoning/.env
```

En az sunlari ayarlayin:

- `DATABASE_URL` veya Supabase kullaniyorsaniz ilgili env’ler
- `SR_USE_DB_STORE=true` ve `SR_DEFAULT_ORG_ID` (SaaS modu for)
- API anahtarlari: `GEMINI_API_KEY`, `VITE_HUGGING_FACE_HUB_TOKEN` vb.
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` vb. (odeme kullanacaksaniz)
- Supabase Auth: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` (auth kullanacaksaniz)

Kaydedip servisi yeniden baslatin:

```bash
systemctl restart super-reasoning
```

### Adim 5: SSL (HTTPS)

Kendi domain’inizi kullaniyorsaniz ucretsiz SSL:

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Hostinger hostname (`srv1327766.hstgr.cloud`) for Hostinger panelinden SSL acilip acilamayacagini kontrol edin; gerekirse yine `certbot --nginx -d srv1327766.hstgr.cloud` deneyebilirsiniz.

### Adim 6: Kontrol

- Site: `http://SUNUCU_IP` veya `http://srv1327766.hstgr.cloud`
- API saglik: `http://SUNUCU_IP/v1/health`

---

## Guncelleme (Update)

Kod guncelledikten sonra VPS’te:

```bash
ssh root@SUNUCU_IP
cd /opt/super-reasoning
bash deploy/update-vps.sh
```

Veya uzaktan tek komutla:

```bash
ssh root@SUNUCU_IP "cd /opt/super-reasoning && bash deploy/update-vps.sh"
```

`update-vps.sh`: `git pull`, `npm ci`, `npm run build`, `systemctl restart super-reasoning` yapar.

---

## Secenek 2: Hostinger Business / Cloud (Node.js uygulamasi)

Hostinger **Business** veya **Cloud** planinda “Node.js Web App” ozelligi varsa:

1. hPanel → **Websites** → **Node.js** bolumune girin.
2. **Create Node.js App** ile yeni uygulama olusturun.
3. **GitHub** ile repo’yu baglayin veya **Upload** ile proje zip’i yukleyin.
4. **Build command:** `npm ci && npm run build`
5. **Start command:** `npx tsx server/index.ts` (veya `node server/index.js` — once `tsx` ile build edilmis tek JS ciktisi kullaniyorsaniz ona gore ayarlayin)
6. **Environment variables** kismina `.env` degerlerinizi ekleyin (DATABASE_URL, API keys, Stripe, Supabase vb.).
7. Root / public path’i `dist` veya uygulamanin statik file sunacak sekilde ayarlayin (Express zaten `dist` sunuyorsa ekstra bir sey gerekmez).

Not: Bu modda tek process (Express) hem API hem `dist` sunar; ayri frontend process’e gerek yoktur.

---

## Architecture (VPS kurulumu)

```
Internet
   │
   ▼
Nginx (:80 / :443)
   │
   ▼
Express (:4000) — Tek process
   ├── /         → dist (frontend)
   ├── /v1/*     → API
   └── /api/v1/* → API
```

- **Tek servis:** `super-reasoning` (systemd)
- **Port:** 4000 (Nginx proxy ile disariya 80/443)

---

## Sik Karsilasilan Sorunlar

| Sorun | Cozum |
|-------|--------|
| 502 Bad Gateway | `systemctl status super-reasoning` ile servisi kontrol edin; `.env` ve `DATABASE_URL` dogru mu bakin. |
| 403 Forbidden | `vite.config.ts` icinde `preview.allowedHosts` kullanilmiyor (production’da Vite preview yok); Nginx’te `server_name` dogru mu kontrol edin. |
| API calismiyor | `journalctl -u super-reasoning -f` ile log alin; port 4000’in dinlendigini `ss -tlnp \| grep 4000` ile kontrol edin. |
| Build hatasi | Sunucuda `node -v` (18+), `npm -v`; `npm run build` ciktisindaki error mesajini inceleyin. |

---

## Ozet komutlar

```bash
# Kurulum (sunucuda, repo ve domain kendi degerlerinizle)
REPO_URL="https://github.com/SIZIN_KULLANICI/super-reasoning.git" \
DOMAIN="srv1327766.hstgr.cloud" \
bash deploy/setup-vps.sh

# .env duzenle
nano /opt/super-reasoning/.env
systemctl restart super-reasoning

# Guncelleme
bash deploy/update-vps.sh

# Log
journalctl -u super-reasoning -f
```

Bu adimlarla proje Hostinger VPS’te tek process (Express) ve Nginx ile calisir.
