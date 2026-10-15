FROM node:24-alpine
RUN npm install -g pnpm@11.18.0
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/chatter/package.json apps/chatter/
RUN pnpm install --frozen-lockfile --filter @tiny-tonkean/chatter...

COPY apps/chatter apps/chatter

WORKDIR /repo/apps/chatter
RUN pnpm build
EXPOSE 4100
CMD ["pnpm", "start"]
