# Hostinger Sunucuya Deploy (GitHub’siz veya GitHub ile)

Uygulama **Hostinger VPS** uzerinde calisir. Iki yol: **GitHub ile** veya **file yukleyerek (GitHub’siz)**.

---

## Once: Hostinger VPS bilgileri

1. **hPanel** (hostinger.com input) → **VPS** → VPS’inizi secin.
2. **IP adresi**, **SSH user** (genelde `root`), **sifre** veya **SSH key**’i not alin.
3. Hostname (orn. `srv1327766.hstgr.cloud`) veya kendi domain’inizi kullanacaksiniz.

Baglanti:
```bash
ssh root@SUNUCU_IP
# veya
ssh root@srv1327766.hstgr.cloud
```

---

## Method A: GitHub’siz — ZIP ile yukleme (Hostinger’a dogrudan)

GitHub kullanmadan, projeyi kendi bilgisayarinizda ZIP’leyip sunucuya atarsiniz.

### 1. Deploy ZIP’i olustur (Windows – proje klasorunde)

PowerShell:
```powershell
cd d:\super-reasoning-v3.1-main
.\deploy\create-deploy-zip.ps1
```

`dist-deploy` klasorunde `super-reasoning_YYYYMMDD_HHMMSS.zip` olusur.

### 2. ZIP’i Hostinger’a upload

- **hPanel** → **File Yoneticisi** (File Manager) veya **SFTP** (orn. FileZilla, WinSCP).
- `/opt` dizinine gidin (yoksa SSH ile `mkdir -p /opt` yapin).
- ZIP’i `/opt` icine yukleyin (orn. `/opt/super-reasoning-deploy.zip`).

### 3. SSH ile baglanip acma ve kurulum

```bash
ssh root@SUNUCU_IP

cd /opt
unzip -o super-reasoning-deploy.zip
# ZIP icinde "super-reasoning-v3.1-main" gibi bir klasor varsa:
mv super-reasoning-v3.1-main super-reasoning
# veya ZIP dogrudan "super-reasoning" adinda acildiysa bir sey yapmayin

cd /opt/super-reasoning
chmod +x deploy/setup-vps-no-git.sh
DOMAIN="srv1327766.hstgr.cloud" bash deploy/setup-vps-no-git.sh
```

`DOMAIN` yerine kendi hostname/domain’inizi yazin.

### 4. .env duzenle

```bash
nano /opt/super-reasoning/.env
```

En az: `GEMINI_API_KEY` veya `VITE_GROQ_API_KEY` vb. (AI Lab / RD-Agent for). Kaydedip:

```bash
systemctl restart super-reasoning
```

### 5. Guncelleme (yeni ZIP ile)

Yeni ZIP olusturup sunucuya yukleyin, sonra:

```bash
ssh root@SUNUCU_IP
cd /opt
# Eski projeyi yedekleyip yeni ZIP'i acin veya ustune cikarin
unzip -o super-reasoning-deploy.zip -d super-reasoning-new
rm -rf /opt/super-reasoning/*
cp -a /opt/super-reasoning-new/* /opt/super-reasoning/
bash /opt/super-reasoning/deploy/update-vps-no-git.sh
```

---

## Method B: GitHub ile (repo sunucuda clone)

Proje GitHub’da ise sunucuda clone edip tek script ile kurarsiniz.

```bash
ssh root@SUNUCU_IP

apt update && apt install -y git
git clone https://github.com/gokhanturkmeen/super-reasoning.git /opt/super-reasoning
cd /opt/super-reasoning

REPO_URL="https://github.com/gokhanturkmeen/super-reasoning.git" \
DOMAIN="srv1327766.hstgr.cloud" \
bash deploy/setup-vps.sh
```

Sonra `.env` duzenleyip `systemctl restart super-reasoning`.

**Guncelleme:**
```bash
ssh root@SUNUCU_IP "cd /opt/super-reasoning && bash deploy/update-vps.sh"
```

---

## Method C: rsync ile (yerel → Hostinger, GitHub’siz)

Projeyi kendi bilgisayarinizdan dogrudan sunucuya senkronize etmek for (Windows’ta Git Bash veya WSL, Mac/Linux’ta dogrudan):

```bash
# Ilk sefer: sunucuda dizin olustur
ssh root@SUNUCU_IP "mkdir -p /opt/super-reasoning"

# Proje kokunden (node_modules ve .git haric)
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  ./ root@SUNUCU_IP:/opt/super-reasoning/
```

Ilk kurulumda sunucuda:
```bash
ssh root@SUNUCU_IP
cd /opt/super-reasoning
DOMAIN="srv1327766.hstgr.cloud" bash deploy/setup-vps-no-git.sh
```

Sonraki guncellemelerde sadece rsync + update script:
```bash
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  ./ root@SUNUCU_IP:/opt/super-reasoning/
ssh root@SUNUCU_IP "cd /opt/super-reasoning && bash deploy/update-vps-no-git.sh"
```

---

## Kontrol

| Ne       | URL |
|----------|-----|
| Site     | `http://SUNUCU_IP` veya `http://srv1327766.hstgr.cloud` |
| API test | `http://SUNUCU_IP/v1/health` |

---

## SSL (HTTPS)

Kendi domain’iniz varsa:
```bash
ssh root@SUNUCU_IP
certbot --nginx -d siteniz.com -d www.siteniz.com
```

---

## Sik komutlar

```bash
# Servis durumu
systemctl status super-reasoning

# Log (canli)
journalctl -u super-reasoning -f

# Yeniden start
systemctl restart super-reasoning

# .env duzenle
nano /opt/super-reasoning/.env
```

Ozet: **Hostinger’a deploy** for ya GitHub’dan clone edip `setup-vps.sh` (Method B), ya ZIP atip `setup-vps-no-git.sh` (Method A), ya da rsync + `setup-vps-no-git.sh` / `update-vps-no-git.sh` (Method C) kullanin.
