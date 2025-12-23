# ---------- BUILDER ----------
FROM python:3.11-slim AS builder

# System deps needed only for build
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Python dependencies
COPY app/requirements.txt .
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

# ---------- RUNTIME ----------
FROM python:3.11-slim

# Runtime system deps
RUN apt-get update && apt-get install -y \
    git \
    openssh-client \
    ca-certificates \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Copy python deps from builder
COPY --from=builder /install /usr/local

# App directory
WORKDIR /app

# Copy application
COPY app/ /app/
COPY static/ /app/static/

# Environment
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production

EXPOSE 5000

# Run with Gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:5000", "main:app"]
