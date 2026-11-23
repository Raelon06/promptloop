# PromptLoop V3.4.1 — Structured Output Benchmark Fix

## Neden?
V3.4, modele `Schema: {"required":..., "types":...}` şeklinde bir şema *tarifi* veriyordu. Qwen3:4b bu tarifi veri yerine çıktı olarak kopyalayabiliyordu. Sonuç: her iki varyant için `FIELD_SET_MISMATCH`.

## Değişiklikler
- Ollama `POST /api/chat` için yeni `RemoteProvider.generate_structured(..., json_schema)` eklendi. `format` alanına **gerçek JSON Schema nesnesi** gönderiliyor; `think: false`, `temperature: 0` korunuyor.
- Benchmark, her iki varyant için aynı `type: object`, `required`, `properties` ve `additionalProperties: false` şemasını kullanıyor.
- Zorunlu bilgi eksikse gereken anahtarlardan biri `null` dönebiliyor. Tam kayıt beklenen örnekte `null` hatalı abstention; eksik veri örneğinde doğru abstention.
- Yerel benchmark doğrulayıcısı şema ve *etiketlenmiş doğru yanıt* eşleşmesini ayrıca kontrol ediyor. JSON Schema çıktının olgusal doğruluğunu kanıtlamaz.
- Önceki V3.2/V3.3/V3.3.1 dosyalarına ve testlerine dokunulmaz.

## Kurulum
```bash
cd ~/Downloads/promptloop_v31
cp app/providers.py app/providers_v34_backup.py
cp app/benchmark.py app/benchmark_v34_backup.py
unzip -o ~/Downloads/PromptLoop_V3_4_1_STRUCTURED_FIX.zip -d .
source .venv/bin/activate
python -m unittest discover -s tests -p 'test_*.py' -v
```
Beklenen: `Ran 45 tests` / `OK`.

## Gerçek Qwen benchmarkı
```bash
python -m app.benchmark_cli \
  --suite benchmarks/dealer_quantity_v1.json \
  --provider ollama \
  --model qwen3:4b \
  --repetitions 1 \
  --out benchmark_result_v341.json
```
Karşılaştırmada `structured_output_mode` = `OLLAMA_JSON_SCHEMA` olmalı. Özellikle `outcomes[*].reason` ve `comparison` alanlarına bakın. Sonuçların geçeceği **garanti değildir**; gerçek model davranışı yerel Mac'te ölçülecektir.

## Sınırlar
- Bu yama yalnızca benchmark için Ollama JSON Schema-kısıtlı çıktı sağlar. Genel Studio akışını değiştirmez.
- `null` semantiği benchmarka özgüdür; Studio'nun `{}` semantiği korunur.
- A/B sentetik, küçük ve tek tekrar; istatistiksel üstünlük iddiası veya otomatik canlıya terfi yok.
- Yerel fixture testleri gerçek Qwen modeliyle yapılmış testlerin yerine geçmez.
