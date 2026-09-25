import logging
import time
from app.services.kafka_consumer import consumer_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")
logger = logging.getLogger("safety_worker")

if __name__ == "__main__":
    logger.info("Starting standalone Safety Observations Kafka Consumer Worker...")
    try:
        consumer_service.start_consumer_loop()
    except KeyboardInterrupt:
        logger.info("Worker stopped by user.")
    except Exception as e:
        logger.error(f"Worker crashed: {e}")
