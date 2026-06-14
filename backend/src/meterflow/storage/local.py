import aiofiles  # type: ignore[import-untyped]
import aiofiles.os  # type: ignore[import-untyped]

from meterflow.storage.base import StorageProvider


class LocalStorageProvider(StorageProvider):
    def __init__(self, base_path: str) -> None:
        self._base = base_path

    def _full_path(self, file_key: str) -> str:
        # file_key may originate from user-supplied data (e.g. imported photo
        # references), so reject any path-traversal characters before use.
        if not file_key or "/" in file_key or "\\" in file_key or ".." in file_key:
            raise ValueError("Invalid file key")
        return f"{self._base}/{file_key}"

    async def upload(self, file_id: str, data: bytes, content_type: str) -> str:
        await aiofiles.os.makedirs(self._base, exist_ok=True)
        async with aiofiles.open(self._full_path(file_id), "wb") as f:
            await f.write(data)
        return file_id

    async def get_url(self, file_key: str) -> str:
        return f"/photos/{file_key}"

    async def delete(self, file_key: str) -> None:
        try:
            await aiofiles.os.remove(self._full_path(file_key))
        except FileNotFoundError:
            pass
