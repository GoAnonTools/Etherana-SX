FROM node:24.5.0-slim AS builder

RUN apt-get update && apt-get install -y python3 python3-pip sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /home/etherana

COPY package.json package-lock.json ./
RUN npm install

COPY tsconfig.json next.config.mjs next-env.d.ts postcss.config.js drizzle.config.ts tailwind.config.ts ./
COPY src ./src
COPY public ./public
COPY drizzle ./drizzle

RUN mkdir -p /home/etherana/data
RUN npm run build

FROM node:24.5.0-slim

RUN apt-get update && apt-get install -y \
    python3-dev python3-babel python3-venv python-is-python3 \
    uwsgi uwsgi-plugin-python3 \
    git build-essential libxslt-dev zlib1g-dev libffi-dev libssl-dev \
    curl sudo \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/etherana

COPY --from=builder /home/etherana/public ./public
COPY --from=builder /home/etherana/.next/static ./public/_next/static
COPY --from=builder /home/etherana/.next/standalone ./
COPY --from=builder /home/etherana/data ./data
COPY drizzle ./drizzle

RUN mkdir /home/etherana/uploads

RUN npm install playwright
RUN npx playwright install --with-deps --only-shell chromium

# App user — runs the Next.js server as non-root so Chromium's sandbox works
RUN useradd --shell /bin/bash --create-home --home-dir /home/etherana-user etherana

# SearXNG user
RUN useradd --shell /bin/bash --system \
    --home-dir "/usr/local/searxng" \
    --comment 'Privacy-respecting metasearch engine' \
    searxng

RUN mkdir "/usr/local/searxng"
RUN mkdir -p /etc/searxng
RUN chown -R "searxng:searxng" "/usr/local/searxng"

COPY searxng/settings.yml /etc/searxng/settings.yml
COPY searxng/limiter.toml /etc/searxng/limiter.toml
COPY searxng/uwsgi.ini /etc/searxng/uwsgi.ini
RUN chown -R searxng:searxng /etc/searxng

ARG SEARXNG_REF=86903a2c666da974462264060fdd80d1f09dd2ee

USER searxng

RUN git clone --filter=blob:none "https://github.com/searxng/searxng" \
                   "/usr/local/searxng/searxng-src" && \
    cd "/usr/local/searxng/searxng-src" && \
    git checkout "$SEARXNG_REF"

RUN python3 -m venv "/usr/local/searxng/searx-pyenv"
RUN "/usr/local/searxng/searx-pyenv/bin/pip" install --upgrade pip setuptools wheel pyyaml msgspec typing_extensions
RUN cd "/usr/local/searxng/searxng-src" && \
    "/usr/local/searxng/searx-pyenv/bin/pip" install --use-pep517 --no-build-isolation -e .

USER root

WORKDIR /home/etherana
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh || true

RUN echo "etherana ALL=(searxng) NOPASSWD: ALL" >> /etc/sudoers

# Give the app user ownership of the data and app directories
RUN chown -R etherana:etherana /home/etherana

EXPOSE 3000 8080

ENV SEARXNG_URL=http://localhost:8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/config >/dev/null || exit 1

# entrypoint.sh starts SearXNG via sudo then drops to etherana for the Node process
USER etherana

CMD ["/home/etherana/entrypoint.sh"]