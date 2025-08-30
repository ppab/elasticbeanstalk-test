FROM public.ecr.aws/docker/library/node:18-alpine as build

RUN npm install -g pnpm

WORKDIR /app

COPY package*.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm config set store-dir /pnpm/store && pnpm install

COPY . .
RUN pnpm run build

FROM public.ecr.aws/nginx/nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
