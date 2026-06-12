from fastapi import HTTPException, status

from meterflow.storage.base import StorageProvider


class NullStorageProvider(StorageProvider):
    async def upload(self, file_id: str, data: bytes, content_type: str) -> str:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Photo storage is not configured. Set STORAGE_BACKEND=minio or STORAGE_BACKEND=local.",
        )

    async def get_url(self, file_key: str) -> str:
        return file_key

    async def delete(self, file_key: str) -> None:
        pass
