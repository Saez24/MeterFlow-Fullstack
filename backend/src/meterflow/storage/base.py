from abc import ABC, abstractmethod


class StorageProvider(ABC):
    @abstractmethod
    async def upload(self, file_id: str, data: bytes, content_type: str) -> str:
        """Upload file, returns stored key."""

    @abstractmethod
    async def get_url(self, file_key: str) -> str:
        """Returns accessible/presigned URL for the stored key."""

    @abstractmethod
    async def delete(self, file_key: str) -> None:
        """Delete file by key. No-op if key doesn't exist."""
