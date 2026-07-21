import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { UserIcon, EnvelopeSimpleIcon, LockKeyIcon, EyeIcon, EyeClosedIcon, CircleNotch } from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { authApi, registerSchema, type RegisterPayload } from '@/lib/api/system/auth'
import { toast } from 'sonner'
import { Captcha } from '@/components/captcha'

export const Route = createFileRoute('/_auth/register')({
  component: Register,
})

function Register() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Captcha state
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaError, setCaptchaError] = useState('')

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterPayload>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res: any) => {
      toast.success(res.message)
      navigate({ to: '/login' })
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message;
      
      const lowerMsg = errorMessage.toLowerCase();
      if (lowerMsg.includes('tên đăng nhập') || lowerMsg.includes('tài khoản') || lowerMsg.includes('username')) {
        setError('username', { type: 'server', message: errorMessage });
      } else if (lowerMsg.includes('email')) {
        setError('email', { type: 'server', message: errorMessage });
      } else if (lowerMsg.includes('mật khẩu') || lowerMsg.includes('password')) {
        setError('password', { type: 'server', message: errorMessage });
      } else {
        toast.error(errorMessage);
      }
    },
  })

  const onSubmit = (data: RegisterPayload) => {
    if (!captchaInput) {
      setCaptchaError('Vui lòng nhập mã xác nhận.')
      return
    }
    if (captchaInput.toLowerCase() !== captchaToken.toLowerCase()) {
      setCaptchaError('Mã xác nhận không chính xác.')
      return
    }
    setCaptchaError('')
    registerMutation.mutate(data)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <Card className="border-border bg-background/80 backdrop-blur-xl text-foreground shadow-2xl w-full p-6">
        <CardHeader className="space-y-1 text-center mb-4">
          <CardTitle className="text-4xl font-bold tracking-tight">Đăng ký</CardTitle>
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
              <Label htmlFor="email" className="text-foreground font-medium text-base md:text-base">Email</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeSimpleIcon className="h-5 w-5 text-muted-foreground/70" aria-hidden="true" />
                </div>
                <Input 
                  id="email" 
                  type="text" 
                  placeholder="m@example.com" 
                  className={`bg-card border-neutral-300 focus-visible:ring-neutral-400 placeholder:text-muted-foreground/70 pl-10 h-11 text-base md:text-base ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium text-base md:text-base">Mật khẩu</Label>
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
              <Label htmlFor="confirmPassword" className="text-foreground font-medium text-base md:text-base">Nhập lại mật khẩu</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockKeyIcon className="h-5 w-5 text-muted-foreground/70" aria-hidden="true" />
                </div>
                <Input 
                  id="confirmPassword" 
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`bg-card border-neutral-300 focus-visible:ring-neutral-400 pl-10 pr-10 h-11 text-base md:text-base ${errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/70 hover:text-muted-foreground transition-colors focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeClosedIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
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
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <>
                  <CircleNotch className="w-5 h-5 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Đăng ký'
              )}
            </Button>
            
            <div className="flex flex-col w-full text-center mt-4">
              <div className="text-sm text-muted-foreground pt-3 border-t border-border/50">
                Đã có tài khoản?{' '}
                <Link to="/login" className="font-semibold text-foreground hover:underline transition-all">
                  Đăng nhập
                </Link>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
