import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { LockKeyIcon, EyeIcon, EyeClosedIcon, CircleNotchIcon, ShieldCheckIcon, EnvelopeSimpleIcon } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/lib/api/system/auth'
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/forgot-password')({
  component: ForgotPassword,
})

function ForgotPassword() {
  const navigate = useNavigate()
  
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetErrors, setResetErrors] = useState<{newPassword?: string, confirmPassword?: string, general?: string}>({})

  const forgotMutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (res: any) => {
      if (res.isSuccess) {
        toast.success(res.message)
        setStep(2)
      } else {
        toast.error(res.message)
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu.')
    }
  })

  const verifyMutation = useMutation({
    mutationFn: authApi.verifyResetCode,
    onSuccess: (res: any) => {
      if (res.isSuccess) {
        toast.success(res.message)
        setStep(3)
      } else {
        toast.error(res.message)
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Mã xác nhận không hợp lệ.')
    }
  })

  const resetMutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: (res: any) => {
      if (res.isSuccess) {
        toast.success(res.message)
        navigate({ to: '/login' })
      } else {
        setResetErrors({ newPassword: res.message })
      }
    },
    onError: (error: any) => {
      setResetErrors({ newPassword: error.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu.' })
    }
  })

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Vui lòng nhập email')
      return
    }
    forgotMutation.mutate({ email })
  }

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code) {
      toast.error('Vui lòng nhập mã xác nhận')
      return
    }
    verifyMutation.mutate({ email, code })
  }

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setResetErrors({})
    let hasError = false
    const errs: {newPassword?: string, confirmPassword?: string} = {}

    if (!newPassword) {
      errs.newPassword = 'Vui lòng nhập mật khẩu mới'
      hasError = true
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Vui lòng xác nhận mật khẩu'
      hasError = true
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Mật khẩu nhập lại không khớp'
      hasError = true
    }

    if (hasError) {
      setResetErrors(errs)
      return
    }
    
    resetMutation.mutate({ email, code, newPassword })
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <Card className="bg-white text-foreground w-full p-2 sm:p-6 border-2 sm:border-[2.5px] border-black rounded-2xl sm:rounded-3xl shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000]">
        <CardHeader className="space-y-2 text-center mb-4">
          <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight">Khôi phục mật khẩu</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            {step === 1 && "Nhập email của bạn để nhận mã xác nhận"}
            {step === 2 && "Nhập mã xác nhận 6 số vừa được gửi đến email"}
            {step === 3 && "Tạo mật khẩu mới cho tài khoản của bạn"}
          </CardDescription>
        </CardHeader>
        
        {step === 1 && (
          <form onSubmit={handleForgotSubmit}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium text-base">Địa chỉ Email</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeSimpleIcon className="h-5 w-5 text-muted-foreground/70" aria-hidden="true" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="VD: nguyenvan@gmail.com"
                    className="bg-card border-neutral-300 focus-visible:ring-neutral-400 placeholder:text-muted-foreground/70 pl-10 h-11 text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pb-6 mt-2">
              <Button
                type="submit"
                className="w-full bg-neutral-900 text-white hover:bg-neutral-800 h-11 text-base shadow-sm"
                disabled={forgotMutation.isPending}
              >
                {forgotMutation.isPending ? (
                  <><CircleNotchIcon className="w-5 h-5 mr-2 animate-spin" />Đang gửi...</>
                ) : 'Gửi mã xác nhận'}
              </Button>
              <div className="text-center mt-4 text-sm text-muted-foreground pt-3 border-t border-border/50 w-full">
                <Link to="/login" className="font-semibold text-foreground hover:underline transition-all">
                  Quay lại Đăng nhập
                </Link>
              </div>
            </CardFooter>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifySubmit}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-foreground font-medium text-base">Mã xác nhận (OTP)</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ShieldCheckIcon className="h-5 w-5 text-muted-foreground/70" aria-hidden="true" />
                  </div>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Nhập 6 số"
                    className="bg-card border-neutral-300 focus-visible:ring-neutral-400 placeholder:text-muted-foreground/70 pl-10 h-11 text-base tracking-widest font-semibold"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pb-6 mt-2">
              <Button
                type="submit"
                className="w-full bg-neutral-900 text-white hover:bg-neutral-800 h-11 text-base shadow-sm"
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? (
                  <><CircleNotchIcon className="w-5 h-5 mr-2 animate-spin" />Đang kiểm tra...</>
                ) : 'Xác nhận mã'}
              </Button>
              <div className="text-center mt-4 w-full flex justify-between text-sm text-muted-foreground pt-3 border-t border-border/50">
                <button type="button" onClick={() => setStep(1)} className="hover:text-foreground">Quay lại</button>
                <button type="button" onClick={handleForgotSubmit} className="hover:text-foreground">Gửi lại mã</button>
              </div>
            </CardFooter>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetSubmit}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-foreground font-medium text-base">Mật khẩu mới</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockKeyIcon className="h-5 w-5 text-muted-foreground/70" aria-hidden="true" />
                  </div>
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`bg-card border-neutral-300 focus-visible:ring-neutral-400 pl-10 pr-10 h-11 text-base ${resetErrors.newPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      if (resetErrors.newPassword) setResetErrors(prev => ({ ...prev, newPassword: undefined }))
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/70 hover:text-muted-foreground focus:outline-none"
                  >
                    {showNewPassword ? <EyeIcon className="h-5 w-5" /> : <EyeClosedIcon className="h-5 w-5" />}
                  </button>
                </div>
                {resetErrors.newPassword && <p className="text-red-500 text-sm mt-1">{resetErrors.newPassword}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground font-medium text-base">Xác nhận mật khẩu</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockKeyIcon className="h-5 w-5 text-muted-foreground/70" aria-hidden="true" />
                  </div>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`bg-card border-neutral-300 focus-visible:ring-neutral-400 pl-10 pr-10 h-11 text-base ${resetErrors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (resetErrors.confirmPassword) setResetErrors(prev => ({ ...prev, confirmPassword: undefined }))
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/70 hover:text-muted-foreground focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeIcon className="h-5 w-5" /> : <EyeClosedIcon className="h-5 w-5" />}
                  </button>
                </div>
                {resetErrors.confirmPassword && <p className="text-red-500 text-sm mt-1">{resetErrors.confirmPassword}</p>}
              </div>
              {resetErrors.general && <p className="text-red-500 text-sm">{resetErrors.general}</p>}
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pb-6 mt-2">
              <Button
                type="submit"
                className="w-full bg-neutral-900 text-white hover:bg-neutral-800 h-11 text-base shadow-sm"
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? (
                  <><CircleNotchIcon className="w-5 h-5 mr-2 animate-spin" />Đang đổi mật khẩu...</>
                ) : 'Đổi mật khẩu'}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
