FROM oven/bun:1.1.8

WORKDIR /app

# Node.js 설치
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY packages ./packages
COPY apps/application ./apps/application

RUN bun install --frozen-lockfile

WORKDIR /app/apps/application
RUN npx next build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "run", "start"]