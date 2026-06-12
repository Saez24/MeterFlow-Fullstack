from typing import Annotated

import jwt
from fastapi import Cookie, HTTPException, status

from meterflow.auth.service import CurrentUser, decode_access_token


async def get_current_user(
    access_token: Annotated[str | None, Cookie()] = None,
) -> CurrentUser:
    if access_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        return decode_access_token(access_token)
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
