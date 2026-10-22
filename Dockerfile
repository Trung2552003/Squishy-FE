# ===== Build =====
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Web và API chạy chung một địa chỉ (nginx chuyển /api sang backend) nên dùng đường dẫn tương đối
ARG VITE_API_BASE_URL=/api
# Tùy chọn: địa chỉ API công khai hiển thị ở trang cài đặt SePay, tên miền riêng của trang đặt trước
ARG VITE_PUBLIC_API_URL=
ARG VITE_PREORDER_SITE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_PUBLIC_API_URL=$VITE_PUBLIC_API_URL \
    VITE_PREORDER_SITE_URL=$VITE_PREORDER_SITE_URL

RUN npm run build

# ===== Serve =====
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
