# PromptLoop V3.3 — Dynamic Prompt Studio (Deneysel Eklenti)

Bu güncelleme V3.2'nin mevcut `app.cli`, `app.engine`, `app.providers` ve test dosyalarını **değiştirmez**. Ayrı bir `app.studio_cli` komutu ekler.

## Kapsam

- Ollama üzerinden kullanıcı promptunu sınıflandırma: `data_extraction`, `code`, `creative`, `analysis`, `other`
- Model tarafından önerilen geliştirilmiş Türkçe prompt
- Görev türüne göre 7 kriterli **heuristik** puanlama (`UNVALIDATED_HEURISTIC`)
- Veri çıkarma görevlerinde kullanıcı isteğine göre alan planlama; ürün alanını otomatik zorunlu kılmama
- Plan JSON'unu Pydantic ile doğrulama; alan adları, tipler ve anahtar kümeleri test edilir
- Kullanıcı kaynak metni de sağlarsa veri çıkarma için ikinci Ollama çağrısı ve dinamik alan şemasıyla kontrol
- Referans veri bulunmadığında `UNVERIFIED`; model doğru JSON üretti diye `PASS` üretmez
- Model eksik bilgi nedeniyle `{}` döndürürse `ABSTAIN`; düzeltilebilir şema hatalarında en fazla 4 toplam veri çıkarma denemesi
- Kaynakta gizli anahtar örneği varsa önce güvenlik kontrolü (bu kontrol üretim düzeyi güvenlik altyapısı değildir)

## Kurulum

```bash
cd ~/Downloads/promptloop_v31
unzip -o ~/Downloads/PromptLoop_V3_3_DYNAMIC_STUDIO_PATCH.zip -d .
source .venv/bin/activate
python -m unittest discover -s tests -p 'test_*.py' -v
```

## Gerçek yerel AI ile prompt analizi

```bash
python -m app.studio_cli \
  --prompt 'Şu satış metninden yalnızca bayi ve miktar bilgilerini çıkar.' \
  --provider ollama --model qwen3:4b
```

## Dinamik alanlı veri çıkarma

```bash
python -m app.studio_cli \
  --prompt 'Şu satış metninden yalnızca bayi ve miktar bilgilerini çıkar.' \
  --source 'Bayi: D000123; Ürün: Ürün A; Miktar: 24 karton' \
  --provider ollama --model qwen3:4b
```

Planın hatalı alan önermesi durumunda kullanıcı açık alan listesini verebilir:

```bash
python -m app.studio_cli \
  --prompt 'Şu satış metninden bayi ve miktarı çıkar.' \
  --source 'Bayi: D000123; Miktar: 24 karton' \
  --fields dealer_code:string,quantity:integer
```

## Sınırlar

- Bu sürüm **üretime hazır genel amaçlı değerlendirme motoru değildir**.
- Sınıflandırma, öneriler ve şema planı AI çıktısıdır; yanlış olabilir.
- Puanlama kurala dayalı basit bir tahmindir, bilimsel değerlendirme değildir.
- Veri çıkarma sonuçlarının gerçek bilgi doğruluğu, bağımsız benchmark olmadığı için doğrulanmaz.
- Yaratıcı yazı, kod üretimi ve analiz görevlerinde yalnızca plan ve prompt önerisi sunar; otomatik çalıştırma/doğrulama yoktur.
- Bilgi eksikliği tespiti burada modelden gelir; V3.2'deki deterministik etiket kontrolü bu yeni bağımsız akışa henüz entegre edilmemiştir.
- Gerçek üretimde sürümleme, insan onayı, veri yönetişimi, API güvenliği ve kapsamlı regresyon testleri gerekecektir.
