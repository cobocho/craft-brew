FROM oven/bun:1.1.30

WORKDIR /app

COPY package.json bun.lock ./
COPY packages ./packages
COPY apps/application ./apps/application

RUN bun install --frozen-lockfile

RUN bun run --cwd apps/application build

ENV NODE_ENV=production
ENV PORT=3000

CMD ["bun", "--cwd", "apps/application", "run", "start"]
