import json
import logging
import socket
from typing import Dict, Any, List, Optional
from kafka import KafkaProducer
from app.core.config import settings

logger = logging.getLogger(__name__)

def is_kafka_reachable(servers_str: str) -> bool:
    try:
        first_server = servers_str.split(",")[0].strip()
        host, port = first_server.split(":")
        with socket.create_connection((host, int(port)), timeout=0.3):
            return True
    except Exception:
        return False

class SafetyKafkaProducer:
    def __init__(self):
        self.producer: Optional[KafkaProducer] = None
        self.is_connected = False
        self._init_producer()

    def _init_producer(self):
        if is_kafka_reachable(settings.KAFKA_BOOTSTRAP_SERVERS):
            try:
                self.producer = KafkaProducer(
                    bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS.split(","),
                    value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
                    key_serializer=lambda k: str(k).encode("utf-8") if k else None,
                    retries=3,
                    request_timeout_ms=2000,
                    max_block_ms=2000,
                )
                self.is_connected = True
                logger.info(f"Kafka Producer connected to {settings.KAFKA_BOOTSTRAP_SERVERS}")
                return
            except Exception as e:
                logger.warning(f"Kafka connection attempt failed: {e}")

        self.producer = None
        self.is_connected = False
        logger.info("Kafka broker is offline. Using event streaming worker pipeline.")

    def publish_observation_row(self, topic: str, row_dict: Dict[str, Any], key: Optional[str] = None) -> bool:
        if not self.producer:
            return False
        try:
            self.producer.send(topic, key=key, value=row_dict)
            return True
        except Exception as e:
            logger.error(f"Error publishing row to Kafka {topic}: {e}")
            return False

    def flush(self):
        if self.producer:
            try:
                self.producer.flush(timeout=2)
            except Exception as e:
                logger.error(f"Error flushing Kafka producer: {e}")

kafka_producer = SafetyKafkaProducer()
