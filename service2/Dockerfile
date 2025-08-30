FROM public.ecr.aws/docker/library/node:18-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package*.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm config set store-dir /pnpm/store && pnpm install --prod

COPY . .

EXPOSE 3002

CMD ["pnpm", "start"]
