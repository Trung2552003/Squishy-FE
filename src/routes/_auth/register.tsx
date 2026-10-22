import { createFileRoute, redirect } from '@tanstack/react-router'

// Route đăng ký đã bị vô hiệu hóa vì hệ thống chỉ dành cho nội bộ.
// Mọi truy cập vào /register sẽ được tự động chuyển hướng về /login.
export const Route = createFileRoute('/_auth/register')({
  beforeLoad: () => {
    throw redirect({ to: '/login' })
  },
  component: () => null,
})
