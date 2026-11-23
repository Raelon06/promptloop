"""SaaS Güvenlik Duvarı, Rate-Limiting ve İstek Kotaları.

Bu modül:
1. In-memory IP tabanlı Sliding Window Rate Limiter uygular (harici bağımlılık gerektirmez).
2. İstek boyut ve token sınırlamalarını denetler.
3. Kötüye kullanım ve DoS ataklarına karşı güvenli koruma sağlar.
"""
from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List
from fastapi import Request, HTTPException, status


@dataclass
class RateLimitRule:
    max_requests: int
    window_seconds: int
    error_message: str


# Varsayılan SaaS kotaları
DEFAULT_RULES: Dict[str, RateLimitRule] = {
    # Prompt optimizasyonu (ağır işlem, bulut modeli çağrısı): Dakikada 5 istek
    "optimize": RateLimitRule(
        max_requests=5,
        window_seconds=60,
        error_message="Çok fazla optimizasyon isteği gönderdiniz. Lütfen bir dakika bekleyin.",
    ),
    # Prompt analizi (hafif heuristik işlem): Dakikada 20 istek
    "analyze": RateLimitRule(
        max_requests=20,
        window_seconds=60,
        error_message="Çok fazla analiz isteği gönderdiniz. Lütfen bir dakika bekleyin.",
    ),
    # Genel API çağrıları: Dakikada 60 istek
    "general": RateLimitRule(
        max_requests=60,
        window_seconds=60,
        error_message="İstek sınırına ulaşıldı. Lütfen biraz sonra tekrar deneyin.",
    ),
}


class RateLimiter:
    """Sliding-window rate limiter utilizing in-memory timestamps per client IP."""

    def __init__(self, rules: Dict[str, RateLimitRule] | None = None) -> None:
        self.rules = rules or DEFAULT_RULES
        # Structure: history[endpoint_category][client_ip] = [timestamp, timestamp, ...]
        self._history: Dict[str, Dict[str, List[float]]] = defaultdict(lambda: defaultdict(list))

    def _get_client_ip(self, request: Request) -> str:
        """İstemci IP adresini güvenli biçimde çıkarır (Reverse Proxy / Cloudflare destekli)."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # En soldaki IP gerçek istemci adresidir
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
            
        if request.client and request.client.host:
            return request.client.host

        return "127.0.0.1"

    def check_rate_limit(self, request: Request, category: str = "general") -> None:
        """Verilen kategori için hız sınırını doğrular, aşılmışsa HTTP 429 fırlatır."""
        rule = self.rules.get(category, self.rules.get("general"))
        if not rule:
            return

        client_ip = self._get_client_ip(request)
        now = time.time()
        window_start = now - rule.window_seconds

        timestamps = self._history[category][client_ip]

        # Pencere dışı eski zaman damgalarını temizle
        valid_timestamps = [ts for ts in timestamps if ts > window_start]
        self._history[category][client_ip] = valid_timestamps

        if len(valid_timestamps) >= rule.max_requests:
            retry_after = int(valid_timestamps[0] - window_start) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"{rule.error_message} (Kalan bekleme süresi: {retry_after} saniye)",
                headers={"Retry-After": str(retry_after)},
            )

        # Yeni isteği kaydet
        self._history[category][client_ip].append(now)

    def reset_for_test(self) -> None:
        """Birim testler için sayaçları sıfırlar."""
        self._history.clear()


# Global tekil rate limiter nesnesi
limiter = RateLimiter()
