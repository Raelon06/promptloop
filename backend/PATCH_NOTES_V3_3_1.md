# PromptLoop V3.3.1 — Prompt Quality Gate (deneysel)

Bu yama yalnızca `app/studio.py` dosyasını değiştirir ve `tests/test_studio_quality.py` ekler. V3.2 motorunu (`app/engine.py`, `app/cli.py`, `app/providers.py`) değiştirmez.

## Düzeltilenler

- LLM'nin `improved_prompt` alanında kelime kesmesi veya kötü yazım üretmesi, veri çıkarma görevlerinde artık doğrudan kullanıcıya aktarılmaz. Alan planından deterministik, tam bir öneri derlenir.
- `audience or unspecified` gibi şema yer tutucuları boş stringe dönüştürülür; gerçek hedef kitle bilinmiyorsa uydurulmaz.
- Türkçe örnek, `bayi` sözcüğünü otomatik `bayi kodu`na zorlamaz. `bayi kodu` açıkça istenirse `dealer_code` önerilir.
- `yalnızca/sadece/only` ile sınırlandırılmış görevlerde, `product`, `unit`, `date`, `price` gibi istem dışı alanlar bulunursa `NEEDS_REVIEW` ile durdurulur. Bu kontrol dar kapsamlıdır, genel semantik doğrulama değildir.
- `dealer_code` / `bayi` belirsizliği uyarı olarak raporlanır.
- `plan_validation` ile değişiklikler ve doğrulanmamış semantik alanlar görünür hale getirilir.

## Mac kurulumu

```bash
cd ~/Downloads/promptloop_v31
cp app/studio.py app/studio_v33_backup.py
unzip -o ~/Downloads/PromptLoop_V3_3_1_QUALITY_PATCH.zip -d .
source .venv/bin/activate
python -m unittest discover -s tests -p 'test_*.py' -v
```

## Qwen ile yeniden deneme

```bash
python -m app.studio_cli --prompt 'Şu satış metninden yalnızca bayi ve miktar bilgilerini çıkar.' --provider ollama --model qwen3:4b
```

**Sınırlar:** Prompt iyileştirici, planın model kaynaklı alan seçimini bütünüyle doğrulamaz. Yeni promptun kesin olarak daha iyi çalıştığı henüz benchmark ile kanıtlanmamıştır. Kaynak sağlanmadan gerçek çıkarma yapılmaz. Kaynak sağlansa bile bağımsız doğrulama yoksa `UNVERIFIED` kalır.
