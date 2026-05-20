# Deploy Documentation Index

Bu dizindeki deploy odakli rehber ve scriptlerin hizli erisim listesidir.

## Core Docs

- [OPS-RUNBOOK.md](./OPS-RUNBOOK.md) — Operasyon runbook: deploy, SSL, Nginx, rollback, incident checklist.
- [HOSTINGER.md](./HOSTINGER.md) — Hostinger VPS adim adim kurulum ve guncelleme rehberi.
- [DEPLOY-VPS-MCP.md](./DEPLOY-VPS-MCP.md) — MCP tabanli VPS deploy yaklasimi.
- [DEPLOY-HOSTINGER-TR.md](./DEPLOY-HOSTINGER-TR.md) — Hostinger deploy Turkce kisa rehber.
- [HOSTINGER-SUNUCU-DEPLOY.md](./HOSTINGER-SUNUCU-DEPLOY.md) — Hostinger sunucu deploy notlari.
- [DEPLOY-VPS-ADIMLAR.md](./DEPLOY-VPS-ADIMLAR.md) — VPS deploy adimlari (ozet).
- [VPS-DEPLOY-KOMUTLARI.md](./VPS-DEPLOY-KOMUTLARI.md) — Pratik deploy komut listesi.

## Primary Scripts

- [setup-vps.sh](./setup-vps.sh) — VPS ilk kurulum (git tabanli).
- [update-vps.sh](./update-vps.sh) — VPS hizli guncelleme.
- [setup-vps-no-git.sh](./setup-vps-no-git.sh) — Git olmadan kurulum alternatifi.
- [update-vps-no-git.sh](./update-vps-no-git.sh) — Git olmadan guncelleme alternatifi.
- [vps-deploy.sh](./vps-deploy.sh) — VPS deploy otomasyon scripti.
- [vps-deploy-mcp.cjs](./vps-deploy-mcp.cjs) — MCP destekli deploy scripti.
- [simple-deploy.cjs](./simple-deploy.cjs) — Basit deploy flow.

## Packaging Utilities

- [create-deploy-zip.sh](./create-deploy-zip.sh) — Unix deploy paketi olusturma.
- [create-deploy-zip.ps1](./create-deploy-zip.ps1) — Windows deploy paketi olusturma.
- [vps-deploy-apply.ps1](./vps-deploy-apply.ps1) — Windows PowerShell ile deploy uygulama.

---

## Recommended Reading Order

1. [OPS-RUNBOOK.md](./OPS-RUNBOOK.md)
2. [HOSTINGER.md](./HOSTINGER.md)
3. Ihtiyaca gore script dosyalari

## Notes

- `._*` ile baslayan dosyalar macOS metadata dosyalaridir, deploy akisinda kullanilmaz.
- Ana referans dokuman her zaman **OPS-RUNBOOK.md** olmalidir.
