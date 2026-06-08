FROM python:3.13-slim AS builder

WORKDIR /app
COPY pyproject.toml .
COPY src/ src/

RUN pip install --no-cache-dir build && python -m build --wheel --outdir /wheels

FROM python:3.13-slim

WORKDIR /app
COPY --from=builder /wheels/*.whl .
RUN pip install --no-cache-dir *.whl && rm *.whl

COPY alembic.ini .
COPY alembic/ alembic/

EXPOSE 8000
CMD ["uvicorn", "meterflow.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
