import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { UserIcon, LockKeyIcon, EyeIcon, EyeClosedIcon, CircleNotchIcon } from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, loginSchema, type LoginPayload } from '@/lib/api/system/auth'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Captcha } from '@/components/captcha'

export const Route = createFileRoute('/_auth/login')({
  component: Login,
})

function Login() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const [showForceChangePassword, setShowForceChangePassword] = useState(false)
  const [forceUsername, setForceUsername] = useState('')
  const [forceOldPassword, setForceOldPassword] = useState('')
  const [forceChangeReason, setForceChangeReason] = useState<'FirstTimeLogin' | 'PasswordExpired'>('PasswordExpired')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [forceChangeErrors, setForceChangeErrors] = useState<{newPassword?: string, confirmNewPassword?: string, general?: string}>({})

  // Captcha state
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaError, setCaptchaError] = useState('')

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginPayload>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res: any, variables) => {
      queryClient.clear()
      toast.success(res.message)
      localStorage.setItem('userName', res.data?.userName || variables.username)
      navigate({ to: '/cms' })
    },
    onError: (error: any, variables) => {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message;
      
      if (errorMessage === 'PasswordExpired' || errorMessage === 'FirstTimeLogin') {
        setForceUsername(variables.username);
        setForceOldPassword(variables.password);
        setForceChangeReason(errorMessage as 'FirstTimeLogin' | 'PasswordExpired');
        setShowForceChangePassword(true);
        if (errorMessage === 'FirstTimeLogin') {
          toast.info('Đây là lần đăng nhập đầu tiên. Vui lòng đổi mật khẩu để bảo vệ tài khoản.');
        } else {
          toast.error('Mật khẩu của bạn đã hết hạn. Vui lòng đổi mật khẩu mới để tiếp tục.');
        }
        return;
      }

      const lowerMsg = errorMessage?.toLowerCase() || '';
      if (lowerMsg.includes('tên đăng nhập') || lowerMsg.includes('tài khoản')) {
        setError('username', { type: 'server', message: errorMessage });
      } else if (lowerMsg.includes('mật khẩu') || lowerMsg.includes('password')) {
        setError('password', { type: 'server', message: errorMessage });
      } else {
        toast.error(errorMessage || 'Đăng nhập thất bại.');
      }
    },
  })

  const forceChangeMutation = useMutation({
    mutationFn: authApi.forceChangePassword,
    onSuccess: (res: any) => {
      if (res.isSuccess === false) {
        setForceChangeErrors({ newPassword: res.message || 'Lỗi kiểm tra cấu hình mật khẩu.' })
        return
      }
      queryClient.clear()
      toast.success(res.message || 'Đổi mật khẩu thành công!')
      localStorage.setItem('userName', res.data?.userName || forceUsername)
      setShowForceChangePassword(false)
      setNewPassword('')
      setConfirmNewPassword('')
      setForceChangeErrors({})
      navigate({ to: '/cms' })
    },
    onError: (error: any) => {
      setForceChangeErrors({ general: error.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu.' })
    }
  })

  const handleForceChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForceChangeErrors({});
    let hasError = false;
    const errors: {newPassword?: string, confirmNewPassword?: string} = {};

    if (!newPassword) {
      errors.newPassword = 'Vui lòng nhập mật khẩu mới.';
      hasError = true;
    }
    if (newPassword && newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = 'Mật khẩu nhập lại không khớp.';
      hasError = true;
    }

    if (hasError) {
      setForceChangeErrors(errors);
      return;
    }

    forceChangeMutation.mutate({
      userName: forceUsername,
      oldPassword: forceOldPassword,
      newPassword: newPassword
    });
  }

  const onSubmit = (data: LoginPayload) => {
    if (!captchaInput) {
      setCaptchaError('Vui lòng nhập mã xác nhận.')
      return
    }
    if (captchaInput.toLowerCase() !== captchaToken.toLowerCase()) {
      setCaptchaError('Mã xác nhận không chính xác.')
      return
    }
    setCaptchaError('')
    loginMutation.mutate(data)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <Card className="bg-white text-foreground w-full p-2 sm:p-6 border-2 sm:border-[2.5px] border-black rounded-2xl sm:rounded-3xl shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000]">
        <CardHeader className="space-y-1 text-center mb-4">
          <CardTitle className="text-3xl sm:text-4xl font-black tracking-tight">Đăng nhập</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground font-medium text-base md:text-base">Tên đăng nhập</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-muted-foreground/70" aria-hidden="true" />
                </div>
                <Input
                  id="username"
                  type="text"
                  placeholder="Tên đăng nhập"
                  className={`bg-card border-neutral-300 focus-visible:ring-neutral-400 placeholder:text-muted-foreground/70 pl-10 h-11 text-base md:text-base ${errors.username ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  {...register('username')}
                />
              </div>
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground font-medium text-base md:text-base">Mật khẩu</Label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockKeyIcon className="h-5 w-5 text-muted-foreground/70" aria-hidden="true" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`bg-card border-neutral-300 focus-visible:ring-neutral-400 pl-10 pr-10 h-11 text-base md:text-base ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/70 hover:text-muted-foreground transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeClosedIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium text-base md:text-base">Mã xác nhận</Label>
              <div className="flex gap-3">
                <Captcha onCaptchaChange={setCaptchaToken} />
                <Input
                  type="text"
                  placeholder="Nhập mã xác nhận"
                  value={captchaInput}
                  onChange={(e) => {
                    setCaptchaInput(e.target.value)
                    if (captchaError) setCaptchaError('')
                  }}
                  className={`bg-card flex-1 h-11 text-base md:text-base ${captchaError ? 'border-red-500 focus-visible:ring-red-500' : 'border-neutral-300 focus-visible:ring-neutral-400'}`}
                />
              </div>
              {captchaError && <p className="text-red-500 text-sm mt-1">{captchaError}</p>}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pb-6 mt-2">
            <Button
              type="submit"
              className="w-full bg-neutral-900 text-white hover:bg-neutral-800 h-11 text-base shadow-sm"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <CircleNotchIcon className="w-5 h-5 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Đăng nhập'
              )}
            </Button>

            <div className="flex flex-col space-y-3 w-full text-center mt-4">
              <Link to="/forgot-password" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Quên mật khẩu?
              </Link>

              <div className="text-xs font-semibold text-slate-500 pt-3 border-t border-border/50">
                🔒 Hệ thống quản trị nội bộ Squishy Pop. Tài khoản do Quản trị viên cấp.
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>

      <Dialog open={showForceChangePassword} onOpenChange={(open) => {
        setShowForceChangePassword(open)
        if (!open) {
          setNewPassword('')
          setConfirmNewPassword('')
          setForceChangeErrors({})
          setShowNewPassword(false)
          setShowConfirmNewPassword(false)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu bắt buộc</DialogTitle>
            <DialogDescription>
              {forceChangeReason === 'FirstTimeLogin'
                ? 'Đây là lần đăng nhập đầu tiên của bạn. Để đảm bảo an toàn, vui lòng đổi mật khẩu mới trước khi tiếp tục sử dụng hệ thống.'
                : 'Mật khẩu của bạn đã hết hạn thời gian hợp lệ. Vui lòng đổi mật khẩu mới để tiếp tục sử dụng hệ thống.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForceChangeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockKeyIcon className="h-5 w-5 text-muted-foreground/70" aria-hidden="true" />
                </div>
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    if (forceChangeErrors.newPassword) setForceChangeErrors(prev => ({ ...prev, newPassword: undefined }))
                  }}
                  placeholder="Nhập mật khẩu mới"
                  className={`pl-10 pr-10 ${forceChangeErrors.newPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/70 hover:text-muted-foreground transition-colors focus:outline-none"
                >
                  {showNewPassword ? (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeClosedIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {forceChangeErrors.newPassword && <p className="text-red-500 text-sm mt-1">{forceChangeErrors.newPassword}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Nhập lại mật khẩu mới</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockKeyIcon className="h-5 w-5 text-muted-foreground/70" aria-hidden="true" />
                </div>
                <Input
                  id="confirmNewPassword"
                  type={showConfirmNewPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value)
                    if (forceChangeErrors.confirmNewPassword) setForceChangeErrors(prev => ({ ...prev, confirmNewPassword: undefined }))
                  }}
                  placeholder="Nhập lại mật khẩu mới"
                  className={`pl-10 pr-10 ${forceChangeErrors.confirmNewPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/70 hover:text-muted-foreground transition-colors focus:outline-none"
                >
                  {showConfirmNewPassword ? (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeClosedIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {forceChangeErrors.confirmNewPassword && <p className="text-red-500 text-sm mt-1">{forceChangeErrors.confirmNewPassword}</p>}
            </div>
            {forceChangeErrors.general && <p className="text-red-500 text-sm">{forceChangeErrors.general}</p>}
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => {
                setShowForceChangePassword(false)
                setNewPassword('')
                setConfirmNewPassword('')
                setForceChangeErrors({})
                setShowNewPassword(false)
                setShowConfirmNewPassword(false)
              }}>
                Hủy
              </Button>
              <Button type="submit" disabled={forceChangeMutation.isPending}>
                {forceChangeMutation.isPending ? 'Đang lưu...' : 'Lưu mật khẩu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
