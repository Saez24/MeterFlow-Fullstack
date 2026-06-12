import asyncio
from functools import partial

import boto3  # type: ignore[import-untyped]
from botocore.client import Config  # type: ignore[import-untyped]

from meterflow.config import Settings
from meterflow.storage.base import StorageProvider


class MinioStorageProvider(StorageProvider):
    def __init__(self, settings: Settings) -> None:
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=Config(signature_version="s3v4"),
        )
        self._bucket = settings.s3_bucket

    async def upload(self, file_id: str, data: bytes, content_type: str) -> str:
        fn = partial(
            self._client.put_object,
            Bucket=self._bucket,
            Key=file_id,
            Body=data,
            ContentType=content_type,
        )
        await asyncio.get_event_loop().run_in_executor(None, fn)
        return file_id

    async def get_url(self, file_key: str) -> str:
        fn = partial(
            self._client.generate_presigned_url,
            "get_object",
            Params={"Bucket": self._bucket, "Key": file_key},
            ExpiresIn=3600,
        )
        return await asyncio.get_event_loop().run_in_executor(None, fn)

    async def delete(self, file_key: str) -> None:
        fn = partial(self._client.delete_object, Bucket=self._bucket, Key=file_key)
        await asyncio.get_event_loop().run_in_executor(None, fn)
