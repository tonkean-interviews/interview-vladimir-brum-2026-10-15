FROM node:24-alpine
RUN npm install -g pnpm@11.18.0
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile --filter @tiny-tonkean/backend...

COPY packages/shared packages/shared
COPY apps/backend apps/backend

WORKDIR /repo/apps/backend
EXPOSE 4000
CMD ["pnpm", "start"]
