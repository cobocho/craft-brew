FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY packages ./packages
COPY apps/application ./apps/application

RUN npm install --workspaces --include-workspace-root
RUN npm run --workspace application build

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "run", "--workspace", "application", "start"]
