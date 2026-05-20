# Hostinger VPS’e MCP ile Deploy

Bu rehber, **Hostinger MCP** kullanarak projeyi VPS’te Docker Compose ile calistirmanizi anlatir.

---

## 1. Hostinger MCP kimlik verification

MCP’nin calismasi for API anahtari gerekir.

### API anahtari alma

1. [hPanel](https://hpanel.hostinger.com) → **Account Profile** → **Account Information**
2. **API** bolumune gidin, **Generate** ile yeni anahtar olusturun
3. Indirilen JSON’daki anahtari veya panelde gosterilen **API Token** degerini kopyalayin

### Cursor’da MCP ayari

**Windows:** `C:\Users\KULLANICI_ADI\.cursor\mcp.json`  
**Mac/Linux:** `~/.cursor/mcp.json`

Dosyayi acip asagidaki yapiyi ekleyin (kendi token’inizi yazin):

```json
{
  "mcpServers": {
    "hostinger-mcp": {
      "command": "npx",
      "args": ["-y", "hostinger-api-mcp@latest"],
      "env": {
        "API_TOKEN": "BURAYA_HOSTINGER_API_ANAHTARINIZ"
      }
    }
  }
}
```

Cursor’u tamamen kapatip yeniden acin. Sonra sohbetten “List my VPS” veya “List my virtual machines” diyerek baglantiyi test edin.

---

## 2. VPS’e proje deploy (MCP ile)

Asagidaki adimlar Cursor AI ile “MCP ile VPS’e deploy et” dediginizde uygulanabilir.

### Gereksinimler

- Hostinger’da bir **VPS** (KVM/VPS) acik olmali
- Proje **GitHub** (veya GitLab) repo’da olmali; root’ta **docker-compose.yaml** bulunur (production for ready)
- MCP kimligi dogrulanmis olmali

### MCP ile yapilacak islemler

1. **Sanal makineleri listele**  
   `getVirtualMachinesV1` ile VPS listesini alin, kullanacaginiz **virtualMachineId** degerini not edin.

2. **Docker Compose projesi olustur**  
   `createNewProjectV1` cagrilir:
   - **virtualMachineId:** Yukaridaki VPS ID
   - **project_name:** Orn. `super-reasoning` (alfanumerik, tire/alt cizgi)
   - **content:** GitHub repo URL’i, orn.  
     `https://github.com/KULLANICI_ADINIZ/super-reasoning`  
     Hostinger bu repoyu klonlar ve root’taki **docker-compose.yaml** ile projeyi calistirir.

3. **Proje calisiyor mu kontrol**  
   `getProjectListV1` veya `getProjectContainersV1` ile proje ve konteyner durumuna bakilir.

### Repo’da olmasi gerekenler

- Root’ta **docker-compose.yaml** (production: tek `app` servisi, port 4000)
- Root’ta **Dockerfile** (mevcut projede var)

Proje ilk kez deploy edilirken image build edilir ve 4000 portunda yayina alinir.

---

## 3. Ortam degiskenleri (API anahtarlari, DB)

Docker Compose’ta `.env` kullanmiyorsaniz, degiskenleri Hostinger uzerinden vermeniz gerekir.

- **Hostinger VPS / Docker:**  
  Proje olusturulurken `createNewProjectV1` icinde **environment** parametresi varsa oraya ekleyin.  
  Yoksa, VPS’e SSH ile baglanip proje klasorunde `.env` olusturup `docker compose up -d` ile yeniden baslatin.

- **Example .env (VPS’te):**  
  `GEMINI_API_KEY`, `DATABASE_URL`, `STRIPE_*`, `SUPABASE_*` vb.

---

## 4. Erisim ve guncelleme

- **Uygulama:** `http://VPS_IP:4000`  
  Isterseniz Nginx ile 80/443’e yonlendirebilirsiniz.

- **Guncelleme:**  
  Repo’da kod degisince MCP’de **updateProjectV1** ile projeyi guncelleyebilir veya VPS’e SSH ile baglanip:
  ```bash
  cd /path/to/project   # Hostinger’in clone ettigi dizin
  git pull
  docker compose up -d --build
  ```

---

## 5. Sorun giderme

| Durum | Ne yapilir |
|--------|-------------|
| **Unauthenticated** | MCP `API_TOKEN` dogru mu, Cursor yeniden baslatildi mi kontrol edin. |
| **Build hatasi** | VPS’te `getProjectLogsV1` ile loglara bakin; Dockerfile ve docker-compose.yaml’i kontrol edin. |
| **Port kapali** | VPS firewall’da 4000 acik mi; Hostinger panelinden gerekirse 4000’i acin. |

Bu adimlarla MCP ile Hostinger VPS’e deploy tamamlanmis olur.
