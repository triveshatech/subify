FROM node:20-bullseye

RUN apt-get update \
  && apt-get install -y \
  ffmpeg \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdrm2 \
  libgbm1 \
  libglu1-mesa \
  libnss3 \
  libpango-1.0-0 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libxshmfence1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --include=dev

COPY . .

RUN npm run build

# Make startup script executable
RUN chmod +x /app/scripts/startup.sh

# Verify bundle was created during build
RUN if [ ! -d "/app/.remotion-bundle" ]; then \
  echo "ERROR: Remotion bundle not created during build!"; \
  echo "Build log should show bundle-remotion output"; \
  exit 1; \
  fi

ENV NODE_ENV=production

EXPOSE 3000

CMD ["/app/scripts/startup.sh"]
