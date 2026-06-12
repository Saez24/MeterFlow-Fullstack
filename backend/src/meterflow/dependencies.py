from functools import lru_cache

from meterflow.config import settings
from meterflow.storage.base import StorageProvider


@lru_cache(maxsize=1)
def _build_storage_provider() -> StorageProvider:
    match settings.storage_backend:
        case "minio":
            from meterflow.storage.minio import MinioStorageProvider
            return MinioStorageProvider(settings)
        case "local":
            from meterflow.storage.local import LocalStorageProvider
            return LocalStorageProvider(settings.local_storage_path)
        case _:
            from meterflow.storage.null import NullStorageProvider
            return NullStorageProvider()


def get_storage() -> StorageProvider:
    return _build_storage_provider()
