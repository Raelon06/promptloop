# PromptLoop V3.1 — Çalıştırılabilir MVP

**Amaç:** Master Doküman V3'ün değerlendirme → optimizasyon → model çağrısı → bağımsız doğrulama → retry → telemetri döngüsünü küçük ve denetlenebilir bir alanda gerçekten çalıştırmak.

**Hızlı başlangıç (Mac Terminal):** Proje klasöründe `./setup.sh` ve sonra `./run_demo.sh` çalıştırın. API arayüzü için `./start_api.sh` çalıştırıp `http://127.0.0.1:8000/docs` adresini açın.

**Kapsam:** Yalnızca Türkçe satış metninden dört alan çıkarma (`dealer_code`, `product`, `quantity`, `unit`). Genel amaçlı prompt mühendisliği platformu değildir. Örnekler sentetiktir.

## 1. macOS / Linux kurulumu

```bash
cd promptloop_v31
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python -m app.cli --file examples/synthetic_sale.json --provider mock
```

Örnek mock çalıştırmasında **ilk deneme geçersiz JSON**, ikinci deneme geçerli JSON üretir. Sonuç `PASS`, `attempts=2`, `output_quality_score=100` beklenir. Bunlar **gerçek LLM başarı oranı değil**, test fikstürü davranışıdır.

## 2. Ollama ile gerçek yerel AI çağrısı

```bash
ollama list
# qwen3:4b yoksa: ollama pull qwen3:4b
python -m app.cli --file examples/synthetic_sale.json --provider ollama --model qwen3:4b
```

Ollama kurulu ve çalışıyor olmalı; port `127.0.0.1:11434`. Modelin başarı garantisi yoktur; doğrulamadan geçmezse en fazla 4 çalıştırma yapılır.

## 3. REST API / Swagger

```bash
uvicorn app.api:app --host 127.0.0.1 --port 8000
```

Tarayıcı: <http://127.0.0.1:8000/docs>. `POST /runs` içine örnekteki JSON'u yapıştırın.

CLI ile API aynı çekirdek motoru çağırır. Telemetri varsayılan olarak `~/.promptloop_v31.sqlite3` dosyasına kaydedilir. Kaydedilenler: SHA-256 içerik özeti, model, skor, doğrulama durumları, zaman ve token sayıları; **ham metin veya çıktı verileri kaydedilmez**.

## 4. İsteğe bağlı bulut API'leri

**Önemli:** Gerçek, hassas veya kurumsal veriler için kullanmayın. `ALLOW_CLOUD=true` vermek harici API'ye veri iletimini bilerek etkinleştirir. Bu demo PII tespiti tam değildir. Kurumsal veri yönetişimi yapılmadan buluta göndermeyin.

```bash
export ALLOW_CLOUD=true
export OPENAI_API_KEY='...'
python -m app.cli --provider openai --model '<erişiminiz-olan-model>'
```

Alternatifler: `ANTHROPIC_API_KEY` + `--provider anthropic`, `GEMINI_API_KEY` + `--provider gemini`. Bulut sağlayıcıları için `--model` zorunludur. Sağlayıcı adaptörleri resmi REST kalıplarına göre yazılmıştır; gerçek anahtarla çevrimiçi uçtan uca test **edilmemiştir**. Sağlayıcı değişiklikleri/erişim şartları farklı olabilir.

## 5. Tamamlananlar / eksikler

**Çalışır:** Pydantic şema, 7 kriterli ve göreve duyarlı *örnek heuristik* puanlama, template optimizer, mock ve Ollama adaptörü, yalnızca sunucuda tanımlı sentetik benchmark referanslarıyla değer kontrolü, kalite kapısı, en fazla 3 retry, seçilmiş hata durumlarında erken durma, PII/secret örüntü engelleme, SQLite deneme kayıtları, 11 otomatik test.

**Üretim için eksik:** Bağımsız LLM hakem ve insan kalibrasyonu, çoğul görev türleri, RBAC/kimlik doğrulama, semantik doğrulama, tam PII tespiti, sandbox kod testleri, para bazlı bütçe/süre aşımında aktif istek iptali, asenkron kuyruk, kalibre benchmark, istatistiksel A/B denemeleri, sürüm yönetişimi, gerçek üretim izleme ve güvenlik denetimi.

**Dürüstlük:** `Q_prompt` bir heuristik tahmindir; bir görevin doğru tamamlandığını ölçmez. Referans veri yoksa şemadan geçmek yalnızca `UNVERIFIED` üretir. `PASS` yalnızca doğrulanabilir 4 alanlık örnek göreve ilişkin geçiştir, gerçek dünyada tüm olası doğruluk koşullarının ispatı değildir. Birim testleri maket/kurallar üzerinde çalışır; canlı LLM çağrıları yerel kullanıcı makinesinde ayrıca denenmelidir.

## 6. Dosya haritası

- `app/models.py`: tipler ve Pydantic veri sözleşmeleri
- `app/references.py`: sunucuya ait güvenilir, sentetik benchmark referansı
- `app/evaluator.py`: prompt skoru, kısıtlı prompt iyileştirme
- `app/providers.py`: mock / Ollama / OpenAI / Claude / Gemini çağrıları
- `app/verifier.py`: harici şema ve referans doğrulaması
- `app/security.py`: kısıtlı ön tarama
- `app/engine.py`: kapalı döngü orkestrasyonu ve hata politikası
- `app/registry.py`: ham içerik saklamayan SQLite kayıtları
- `app/api.py`: FastAPI uçları
- `tests/test_pipeline.py`: deterministik testler

## 7. Ground-truth güven sınırı

`benchmark_id=synthetic_sale_v1` yalnızca kaynak metin `app/references.py` içindeki doğrulanmış sentetik örnekle birebir eşleşirse kullanılır. İstemci, kendisinin gönderdiği beklenen sonucu “doğrulanmış hakikat” olarak kaydettiremez. Benchmark ID çıkarılırsa veya metin farklılaşırsa sonuç şema doğru olsa bile `UNVERIFIED` olur.

## 8. Mimari sınırlar

- Bu ilk sürüm **yalnızca yapılandırılmış veri çıkarma** görevini destekler; evrensel prompt optimizasyon motoru değildir.
- 7 kriterli puanlama **anahtar kelime heuristiği** ile yapılır; gerçek uzman rubriğinin yerini tutmaz.
- Optimize edilen prompt bir görev şablonudur; herhangi bir rastgele promptun anlamsal hedeflerini otomatik anlayıp yeniden yazmaz.
- `benchmark_id` kimliği sonuçları kendiliğinden kanıtlamaz; sunucu kaynak eşleşmesini kontrol eder.
- İlk örnek PASS kararı yalnızca sentetik benchmark için doğrulanır. Gerçek belgeler doğrulanmamış kalır.
- Bu prototipi internete açık sunucuda çalıştırmayın; kimlik doğrulama, rate-limit, kapsamlı PII tarama ve sürekli izleme henüz yoktur.
- Çağrı başına ağ timeout'u 60 saniyedir. Toplam süre limiti denemeler arasında kontrol edilir; aktif isteği kesin süresinde iptal eden production deadline henüz yoktur.

## 9. Telemetri raporu

```bash
python -m app.report
```

Çıktı, sağlayıcı/model başına doğrulanmış PASS, UNVERIFIED ve ilk deneme başarı oranlarını gösterir. Küçük test kümelerinden elde edilen oranları genel model başarısı olarak yorumlamayın.
