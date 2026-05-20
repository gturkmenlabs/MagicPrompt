# Hostinger public_html FTP Deploy

Bu akış, projenin sadece statik `dist/` çıktısını Hostinger `public_html` dizinine yükler.

## Ne zaman kullanılır

- Site sadece frontend ise
- Backend API ayrı bir VPS veya servis üzerindeyse
- Hostinger shared hosting / FTP erişimi varsa

## Gerekli bilgiler

- FTP host (ör. `ftp://ftp.sizin-domain.com` veya panelde verilen sunucu)
- FTP kullanıcı adı ve şifresi
- Hedef klasör: genelde `public_html`

## Kurulum

`.env` dosyana şu değişkenleri ekle (değerleri kendi hosting panelinden al):

```bash
HOSTINGER_FTP_HOST=ftp://ftp.example.com
HOSTINGER_FTP_USER=your_ftp_username
HOSTINGER_FTP_PASSWORD=...
HOSTINGER_FTP_PATH=public_html
HOSTINGER_FTP_SECURE=auto
```

## Deploy

```bash
npm run deploy:hostinger:ftp
```

Script otomatik olarak:

1. `dist/` yoksa `npm run build` çalıştırır
2. FTP/FTPS ile Hostinger’a bağlanır
3. `dist/` içeriğini `public_html` altına yükler

## Not

Bu yöntem yalnızca statik frontend içindir. Express API bu ortamda çalışmaz; API gerekiyorsa ayrıca VPS veya Node destekli hosting gerekir.
