# Arşiv manifest — 2026-03-20

Aşağıdaki dizinler **silinmeden** şu konuma taşındı:

`archive/2026-03-20/generated-artifacts/`

| Dizin | Açıklama |
|--------|-----------|
| `dist-server-cjs` | CJS sunucu derlemesi (yeniden üretilebilir) |
| `dist-server` | Sunucu bundle |
| `dist-deploy` | Dağıtım zip/artefact |
| `playwright-report` | E2E HTML raporu |
| `test-results` | Playwright sonuçları |
| `playwright-shots` | E2E ekran görüntüleri |
| `output` | Script çıktıları |
| `ui-analysis-report` | UI analiz raporu |

`dist/` (Vite frontend build) kökte bırakıldı; `npm run build` ile güncellenir.

Geri almak için:

```bash
mv archive/2026-03-20/generated-artifacts/<klasör_adı> .
```
