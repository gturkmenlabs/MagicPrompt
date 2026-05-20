# Models (`/models`)

Bu dizin, **eğitilmiş model artefact’ları** için kök seviye konvansiyondur (MLOps hizalaması).

| Tür | Konum önerisi |
|-----|----------------|
| Fine-tune metadata + model kartı JSON | [`data/fine-tuning/models/`](../data/fine-tuning/models/) |
| OpenAI / sağlayıcı job çıktıları, checkpoint export | `models/exports/<model_id>/` (büyük dosyaları commit etmeyin) |
| Yerel ağırlık dosyaları | `.gitignore` ile hariç tutun veya private artifact store |

Şema: [`docs/model-card.schema.json`](../docs/model-card.schema.json)
