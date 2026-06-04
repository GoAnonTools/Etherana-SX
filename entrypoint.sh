#!/bin/sh
set -e

# Resolve the SearXNG secret: use $SEARXNG_SECRET if set, otherwise generate a random one.
if [ -z "$SEARXNG_SECRET" ]; then
  echo "SEARXNG_SECRET not set — generating a random secret for this session."
  SEARXNG_SECRET=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || od -An -tx1 -N32 /dev/urandom | tr -d ' \n')
fi

# Substitute the placeholder in the settings file with the resolved secret.
sed -i "s/SEARXNG_SECRET_PLACEHOLDER/${SEARXNG_SECRET}/" /etc/searxng/settings.yml

echo "Starting SearXNG..."

# SearXNG needs to run as the searxng user; the container runs as etherana so we use sudo.
# Using uwsgi (production-grade) instead of Flask dev server for reliability and concurrency.
sudo -H -u searxng /usr/bin/uwsgi \
  --plugin python3 \
  --module searx.webapp:app \
  --virtualenv /usr/local/searxng/searx-pyenv \
  --pythonpath /usr/local/searxng/searxng-src \
  --chdir /usr/local/searxng/searxng-src \
  --http 0.0.0.0:8080 \
  --workers 4 \
  --threads 4 \
  --enable-threads \
  --disable-logging \
  --log-5xx \
  --master \
  --env SEARXNG_SETTINGS_PATH=/etc/searxng/settings.yml \
  &
SEARXNG_PID=$!

echo "Waiting for SearXNG to be ready..."
sleep 5

COUNTER=0
MAX_TRIES=30
until curl -s http://localhost:8080 > /dev/null 2>&1; do
  COUNTER=$((COUNTER+1))
  if [ $COUNTER -ge $MAX_TRIES ]; then
    echo "Warning: SearXNG health check timeout, but continuing..."
    break
  fi
  sleep 1
done

if curl -s http://localhost:8080 > /dev/null 2>&1; then
  echo "SearXNG started successfully (PID: $SEARXNG_PID)"
else
  echo "SearXNG may not be fully ready, but continuing (PID: $SEARXNG_PID)"
fi

cd /home/etherana
echo "Starting Etherana SX..."

exec node server.js