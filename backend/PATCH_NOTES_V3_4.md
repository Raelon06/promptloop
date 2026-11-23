# PromptLoop V3.4 — Paired A/B Benchmark (Experimental)

## Amaç
Gerçek iyileştirmeyi ölçmek. V3.3.1'in `improved_prompt` metnini *gerçek model girdisi* olarak ayrı bir varyantta çalıştırır; orijinal promptla aynı model ve aynı örnekler üzerinde karşılaştırır. Her çıktıyı insan tarafından önceden etiketlenmiş **sentetik referans** cevaplarla test eder.

## Kurulum
V3.3.1 kurulumu bulunan `~/Downloads/promptloop_v31` dizininde:

```bash
unzip -o ~/Downloads/PromptLoop_V3_4_AB_BENCHMARK_PATCH.zip -d .
source .venv/bin/activate
python -m unittest discover -s tests -p 'test_*.py' -v
```

## Gerçek Qwen değerlendirmesi

```bash
python -m app.benchmark_cli \
  --suite benchmarks/dealer_quantity_v1.json \
  --provider ollama \
  --model qwen3:4b \
  --repetitions 1 \
  --out benchmark_result_v34.json
```

Bu komut önce Qwen ile bir prompt planı oluşturur. Planın alanları etiketli veri kümesindeki beklenen alanlarla eşleşmezse işlem durur (`PLAN_FIELD_MISMATCH`). Eşleşirse 8 sentetik örnekte iki varyantı ayrı ayrı çalıştırır (8×2=16 çıktı çağrısı + 1 plan çağrısı). Bazı örneklerde doğru çıktı `{}` olup test **ABSTAIN** başarısı sayılır.

**Önemli:** `BENCHMARK_COMPLETE_REVIEW_REQUIRED`, uygulamanın canlıya çıkmaya hazır olduğu anlamına gelmez. `comparison` içinde iki varyantın doğruluk oranı, işaretlenmiş hatalar ve gecikmeleri bulunur. Şimdilik hiçbir otomatik model/prompt terfisi yapılmaz.

## Mimari sınırlar
- Kıyas, aynı ortak veri çıkarma güvenlik ve JSON sözleşmesi altında yürütülür; saf ve serbest iki promptu karşılaştırdığını iddia etmez.
- 8 sentetik örnek istatistiksel üstünlük veya üretim genellenebilirliği kanıtlamaz.
- Kaynak metni çıktı raporuna eklemez; yalnızca örnek ID ve sonuç kodu raporlanır. Girdi veri kümesi yerel dosyadır.
- Demo veri kümesi sentetiktir ve eğitim amacıyla etiketlenmiştir. Kişisel/kurumsal verilerle bulut sağlayıcısı kullanmadan önce veri yönetişimi ayrı denetlenmelidir.
- Mevcut `app/studio.py` veya eski CLI dosyalarını değiştirmez.
- Gizlilik/veri güvenliği için `preflight` yalnızca sınırlı bir ilk kontrol katmanıdır. Gerçek sistemde ayrı politika ve erişim kontrolleri gerekir.
