FROM node:24-alpine
RUN npm install -g pnpm@11.18.0
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/frontend/package.json apps/frontend/
RUN pnpm install --frozen-lockfile --filter @tiny-tonkean/frontend...

COPY packages/shared packages/shared
COPY apps/frontend apps/frontend

WORKDIR /repo/apps/frontend
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
