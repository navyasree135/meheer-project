import os
import shutil
import logging
from typing import BinaryIO, Optional
import boto3
from botocore.exceptions import ClientError
from app.core.config import settings

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.s3_client = None
        self.bucket_name = settings.S3_BUCKET_NAME
        self.local_storage_dir = settings.LOCAL_STORAGE_DIR
        os.makedirs(self.local_storage_dir, exist_ok=True)
        self._init_s3()

    def _init_s3(self):
        try:
            client = boto3.client(
                "s3",
                endpoint_url=settings.S3_ENDPOINT_URL,
                aws_access_key_id=settings.S3_ACCESS_KEY,
                aws_secret_access_key=settings.S3_SECRET_KEY,
                region_name=settings.S3_REGION,
            )
            # Check or create bucket
            try:
                client.head_bucket(Bucket=self.bucket_name)
            except ClientError:
                try:
                    client.create_bucket(Bucket=self.bucket_name)
                except Exception:
                    pass
            self.s3_client = client
            logger.info(f"Connected to S3/MinIO at {settings.S3_ENDPOINT_URL}, bucket: {self.bucket_name}")
        except Exception as e:
            logger.warning(f"S3/MinIO not available ({e}). Using local storage fallback: {self.local_storage_dir}")
            self.s3_client = None

    def upload_file(self, file_obj: BinaryIO, filename: str, content_type: Optional[str] = None) -> str:
        """
        Stores file in S3/MinIO and/or local filesystem.
        Returns the object key / storage path.
        """
        key = f"uploads/{filename}"
        local_path = os.path.join(self.local_storage_dir, filename)

        # Always save a local copy for safe fast access
        file_obj.seek(0)
        with open(local_path, "wb") as f:
            shutil.copyfileobj(file_obj, f)

        # Also upload to S3 if available
        if self.s3_client:
            try:
                file_obj.seek(0)
                extra_args = {"ContentType": content_type} if content_type else {}
                self.s3_client.upload_fileobj(file_obj, self.bucket_name, key, ExtraArgs=extra_args)
                logger.info(f"File uploaded to S3: s3://{self.bucket_name}/{key}")
                return f"s3://{self.bucket_name}/{key}"
            except Exception as e:
                logger.warning(f"Failed to upload to S3 ({e}), falling back to local file.")

        return local_path

    def get_file_path(self, storage_key: str) -> str:
        """Returns accessible local file path for reading."""
        if storage_key.startswith("s3://"):
            key = storage_key.replace(f"s3://{self.bucket_name}/", "")
            filename = os.path.basename(key)
            local_path = os.path.join(self.local_storage_dir, filename)
            if not os.path.exists(local_path) and self.s3_client:
                self.s3_client.download_file(self.bucket_name, key, local_path)
            return local_path
        return storage_key

storage_service = StorageService()
