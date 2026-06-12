import logging
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from meterflow.auth.dependencies import get_current_user
from meterflow.auth.schemas import LoginRequest, RegisterRequest, UserResponse
from meterflow.auth.service import (
    CurrentUser,
    create_access_token,
    create_refresh_token,
    get_user_by_email,
    get_user_by_id,
    register_user,
    revoke_refresh_token,
    rotate_refresh_token,
    verify_password_async,
)
from meterflow.config import settings
from meterflow.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

_ACCESS_MAX_AGE = settings.access_token_expire_minutes * 60
_REFRESH_MAX_AGE = settings.refresh_token_expire_days * 86400


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=_ACCESS_MAX_AGE,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=_REFRESH_MAX_AGE,
        path="/api/v1/auth/refresh",
    )


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
@limiter.limit("5/minute")
async def register(
    request: Request,
    body: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    try:
        user = await register_user(db, body.email, body.password)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        ) from None

    access_token = create_access_token(user.id, user.email)
    refresh_token = await create_refresh_token(db, user.id)
    _set_auth_cookies(response, access_token, refresh_token)
    logger.info("auth.register.success user_id=%s", user.id)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=UserResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    user = await get_user_by_email(db, body.email)
    if user is None or not await verify_password_async(body.password, user.hashed_password):
        logger.warning("auth.login.failed email=%s", body.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token = create_access_token(user.id, user.email)
    refresh_token = await create_refresh_token(db, user.id)
    _set_auth_cookies(response, access_token, refresh_token)
    logger.info("auth.login.success user_id=%s", user.id)
    return UserResponse.model_validate(user)


@router.post("/refresh", response_model=UserResponse)
async def refresh(
    response: Response,
    refresh_token: Annotated[str | None, Cookie()] = None,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token",
        )
    try:
        new_refresh_raw, user_id = await rotate_refresh_token(db, refresh_token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        ) from None

    user = await get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    new_access = create_access_token(user.id, user.email)
    _set_auth_cookies(response, new_access, new_refresh_raw)
    return UserResponse.model_validate(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    refresh_token: Annotated[str | None, Cookie()] = None,
    db: AsyncSession = Depends(get_db),
) -> None:
    if refresh_token is not None:
        await revoke_refresh_token(db, refresh_token)
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token", path="/api/v1/auth/refresh")


@router.get("/me", response_model=UserResponse)
async def me(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    user = await get_user_by_id(db, current_user.id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return UserResponse.model_validate(user)
