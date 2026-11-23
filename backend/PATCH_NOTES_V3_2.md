# PromptLoop V3.2 — ABSTAIN düzeltmesi

## Kapsam
- Dar ve etiketli girdi biçiminde zorunlu alan eksikliği, model çağrısından önce tespit edilir. Bu durumda `ABSTAIN`, `verified=false`, `missing_fields`, `attempts=[]` döner.
- Serbest metin veya bilinmeyen gramer için kesin eksiklik yargısı verilmez.
- Modelin `{}` yanıtı, referans yoksa doğrulanmamış `ABSTAIN` kabul edilir; referans tam veri içeriyorsa `FAIL` sayılır.
- Tam veriyle başarılı üretim ve önceki API alanları korunur.
- Yerel Ollama adaptöründe `think=false` ayarı dahildir.

## Mevcut Mac kurulumuna uygulama

Önce ZIP dosyasını `~/Downloads` klasörüne indirin, ardından Terminal'de:

```bash
cd ~/Downloads/promptloop_v31
cp -R app app_backup_v31
cp tests/test_pipeline.py tests/pipeline_v31_backup.py
unzip -o ~/Downloads/PromptLoop_V3_2_ABSTAIN_PATCH.zip -d .
source .venv/bin/activate
python -m unittest discover -s tests -p 'test_pipeline.py' -v
python -m app.cli --file examples/missing_product.json --provider ollama --model qwen3:4b
python -m app.cli --file examples/synthetic_sale.json --provider ollama --model qwen3:4b
```

**Beklenen eksik ürün:** `status=ABSTAIN`, `missing_fields=["product"]`, `attempts=[]`, `verified=false`, `candidate=null`. Gerçek Ollama çağrısı gerçekleşmez. Bu, bir model başarı testi değil, yerel deterministik ön kontroldür.

**Beklenen tam veri:** `PASS` ancak gerçek model çıktısı şema ve güvenilir referans veri testlerinden geçerse döner.

### Geri alma

```bash
cd ~/Downloads/promptloop_v31
cp -R app_backup_v31/. app/
cp tests/pipeline_v31_backup.py tests/test_pipeline.py
```

Not: Bu yama sadece sentetik demo grameri için güvenli tamlık kontrolüdür. Gerçek bir genel amaçlı belge analizinin doğru/eksik veri kararı için yeterli değildir. Düzenlemeler kullanıcı dosyalarına otomatik uygulanmaz.
