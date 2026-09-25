import json
import logging
import socket
from urllib.parse import urlparse
from typing import Any, Optional, Dict
import redis
from app.core.config import settings

logger = logging.getLogger(__name__)

def is_port_open(host: str, port: int, timeout: float = 0.4) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False

class MemoryCacheFallback:
    """In-memory cache fallback when standalone Redis is not running."""
    def __init__(self):
        self._store: Dict[str, str] = {}
        self._hash_store: Dict[str, Dict[str, str]] = {}
        
    def get(self, key: str) -> Optional[str]:
        return self._store.get(key)
        
    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        self._store[key] = value
        return True
        
    def delete(self, *keys: str) -> int:
        count = 0
        for key in keys:
            if key in self._store:
                del self._store[key]
                count += 1
            if key in self._hash_store:
                del self._hash_store[key]
                count += 1
        return count
        
    def hset(self, name: str, key: Optional[str] = None, value: Optional[str] = None, mapping: Optional[Dict[str, Any]] = None) -> int:
        if name not in self._hash_store:
            self._hash_store[name] = {}
        if mapping:
            for k, v in mapping.items():
                self._hash_store[name][str(k)] = str(v)
            return len(mapping)
        if key and value is not None:
            self._hash_store[name][str(key)] = str(value)
            return 1
        return 0

    def hget(self, name: str, key: str) -> Optional[str]:
        return self._hash_store.get(name, {}).get(str(key))

    def hgetall(self, name: str) -> Dict[str, str]:
        return self._hash_store.get(name, {}).copy()

    def keys(self, pattern: str = "*") -> list:
        import fnmatch
        all_keys = list(self._store.keys()) + list(self._hash_store.keys())
        return [k for k in all_keys if fnmatch.fnmatch(k, pattern)]

    def ping(self) -> bool:
        return True


class CacheManager:
    def __init__(self):
        self.client = None
        self.is_connected = False
        self._init_client()

    def _init_client(self):
        parsed = urlparse(settings.REDIS_URL)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379

        if is_port_open(host, port, timeout=0.3):
            try:
                r = redis.Redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=1
                )
                r.ping()
                self.client = r
                self.is_connected = True
                logger.info(f"Connected to Redis at {settings.REDIS_URL}")
                return
            except Exception as e:
                logger.warning(f"Failed to connect to Redis ({e}). Using in-memory fallback.")

        self.client = MemoryCacheFallback()
        self.is_connected = False
        logger.info("Using in-memory cache and state manager.")

    def get_json(self, key: str) -> Optional[Any]:
        try:
            val = self.client.get(key)
            if val:
                return json.loads(val)
        except Exception as e:
            logger.error(f"Error reading cache key {key}: {e}")
        return None

    def set_json(self, key: str, value: Any, ttl: int = settings.REDIS_CACHE_TTL_SECONDS) -> bool:
        try:
            val_str = json.dumps(value, default=str)
            self.client.set(key, val_str, ex=ttl)
            return True
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            return False

    def invalidate_prefix(self, prefix: str):
        try:
            keys = self.client.keys(f"{prefix}*")
            if keys:
                self.client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cache keys with prefix '{prefix}'")
        except Exception as e:
            logger.error(f"Error invalidating cache prefix {prefix}: {e}")

    def set_job_status(self, job_id: str, stage: str, processed_count: int, total_count: int, status: str = "PROCESSING", error: Optional[str] = None):
        try:
            payload = {
                "job_id": job_id,
                "stage": stage,
                "processed_count": str(processed_count),
                "total_count": str(total_count),
                "percent": str(round((processed_count / total_count * 100) if total_count > 0 else 0, 1)),
                "status": status,
                "error": error or ""
            }
            self.client.hset(f"job:{job_id}", mapping=payload)
        except Exception as e:
            logger.error(f"Error setting job status for {job_id}: {e}")

    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        try:
            data = self.client.hgetall(f"job:{job_id}")
            if data:
                return {
                    "job_id": data.get("job_id", job_id),
                    "stage": data.get("stage", "PENDING"),
                    "processed_count": int(data.get("processed_count", 0)),
                    "total_count": int(data.get("total_count", 0)),
                    "percent": float(data.get("percent", 0.0)),
                    "status": data.get("status", "PENDING"),
                    "error": data.get("error") or None
                }
        except Exception as e:
            logger.error(f"Error getting job status for {job_id}: {e}")
        return {
            "job_id": job_id,
            "stage": "UNKNOWN",
            "processed_count": 0,
            "total_count": 0,
            "percent": 0.0,
            "status": "PENDING",
            "error": None
        }

cache_manager = CacheManager()
