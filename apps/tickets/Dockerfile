FROM node:24-alpine
RUN npm install -g pnpm@11.18.0
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/tickets/package.json apps/tickets/
RUN pnpm install --frozen-lockfile --filter @tiny-tonkean/tickets...

COPY apps/tickets apps/tickets

WORKDIR /repo/apps/tickets
RUN pnpm build
EXPOSE 4200
CMD ["pnpm", "start"]
