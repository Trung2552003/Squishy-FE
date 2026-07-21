import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { securitySettingApi, type SystemSecuritySetting } from '@/lib/api/system/securitySetting'
import { ShieldCheckIcon, FloppyDiskIcon } from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'
import { usePermission } from '@/hooks/usePermission'

export const Route = createFileRoute('/cms/_system/security-settings/')({
  component: SecuritySettingsPage,
})

function SecuritySettingsPage() {
  const queryClient = useQueryClient()
  const { data: response, isLoading } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: securitySettingApi.getSetting,
  })

  const { checkPermission } = usePermission()
  const canSave = checkPermission('SystemSecuritySetting_Save')

  const [formData, setFormData] = useState<SystemSecuritySetting | null>(null)

  // Initialize form data when API loads
  if (response?.data && formData === null) {
    setFormData(response.data as SystemSecuritySetting)
  }

  const updateMutation = useMutation({
    mutationFn: (data: SystemSecuritySetting) => securitySettingApi.updateSetting(data),
    onSuccess: (res: any) => {
      if (res?.isSuccess) {
        toast.success(res?.message || 'Cập nhật cấu hình bảo mật thành công!')
        queryClient.invalidateQueries({ queryKey: ['securitySettings'] })
      } else {
        toast.error(res?.message || 'Có lỗi xảy ra khi cập nhật.')
      }
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi cập nhật.')
    }
  })

  const handleChange = (field: keyof SystemSecuritySetting, value: any) => {
    if (formData) {
      setFormData({ ...formData, [field]: value })
    }
  }

  const handleSave = () => {
    if (formData) {
      const payload = { ...formData }
      payload.minPasswordLength = Number(payload.minPasswordLength) || 8
      payload.passwordExpiryDays = Number(payload.passwordExpiryDays) || 0
      payload.maxFailedAccessAttempts = Number(payload.maxFailedAccessAttempts) || 5
      payload.lockoutDurationMinutes = Number(payload.lockoutDurationMinutes) || 15
      updateMutation.mutate(payload)
    }
  }

  if (isLoading || !formData) {
    return (
      <div className="p-6">
        <Skeleton className="w-full h-96" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <ShieldCheckIcon weight="fill" className="text-blue-500 w-8 h-8 lg:w-9 lg:h-9" />
            Cấu hình Bảo mật
          </h1>
          <p className="text-muted-foreground mt-1 lg:mt-2 text-sm lg:text-lg">
            Thiết lập các chính sách về mật khẩu, khóa tài khoản và kiểm soát IP quản trị.
          </p>
        </div>
        {canSave && (
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-lg">
            <FloppyDiskIcon weight="bold" className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="lg:text-xl">Quy tắc Mật khẩu</CardTitle>
            <CardDescription className="text-sm lg:text-base">Thiết lập độ phức tạp của mật khẩu người dùng.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="minPasswordLength" className="text-sm lg:text-base">Độ dài tối thiểu (ký tự)</Label>
              <Input
                id="minPasswordLength"
                type="number"
                min={4}
                max={50}
                className="text-sm lg:text-base"
                value={formData.minPasswordLength}
                onChange={(e) => handleChange('minPasswordLength', e.target.value === '' ? '' : parseInt(e.target.value))}
              />
            </div>

            <div className="flex items-center justify-between border-b pb-4">
              <div className="space-y-0.5">
                <Label className="text-sm lg:text-base">Chữ cái Hoa (A-Z)</Label>
                <div className="text-sm lg:text-base text-muted-foreground">Yêu cầu ít nhất 1 chữ hoa</div>
              </div>
              <Checkbox
                checked={formData.requireUppercase}
                onCheckedChange={(v: boolean) => handleChange('requireUppercase', v)}
              />
            </div>

            <div className="flex items-center justify-between border-b pb-4">
              <div className="space-y-0.5">
                <Label className="text-sm lg:text-base">Chữ cái Thường (a-z)</Label>
                <div className="text-sm lg:text-base text-muted-foreground">Yêu cầu ít nhất 1 chữ thường</div>
              </div>
              <Checkbox
                checked={formData.requireLowercase}
                onCheckedChange={(v: boolean) => handleChange('requireLowercase', v)}
              />
            </div>

            <div className="flex items-center justify-between border-b pb-4">
              <div className="space-y-0.5">
                <Label className="text-sm lg:text-base">Chữ số (0-9)</Label>
                <div className="text-sm lg:text-base text-muted-foreground">Yêu cầu ít nhất 1 số</div>
              </div>
              <Checkbox
                checked={formData.requireNumber}
                onCheckedChange={(v: boolean) => handleChange('requireNumber', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm lg:text-base">Ký tự Đặc biệt (!@#...)</Label>
                <div className="text-sm lg:text-base text-muted-foreground">Yêu cầu ít nhất 1 ký tự đặc biệt</div>
              </div>
              <Checkbox
                checked={formData.requireSpecialCharacter}
                onCheckedChange={(v: boolean) => handleChange('requireSpecialCharacter', v)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="lg:text-xl">Vòng đời Mật khẩu & Đăng nhập</CardTitle>
              <CardDescription className="text-sm lg:text-base">Thiết lập thời gian hết hạn và khóa tài khoản.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="passwordExpiryDays" className="text-sm lg:text-base">Thời gian mật khẩu hợp lệ (Ngày)</Label>
                <div className="text-sm lg:text-base text-muted-foreground mb-2">Sau thời gian này, tài khoản sẽ bị khóa và bắt buộc đổi mật khẩu mới. Đặt là 0 nếu không muốn hết hạn.</div>
                <Input
                  id="passwordExpiryDays"
                  type="number"
                  min={0}
                  className="text-sm lg:text-base"
                  value={formData.passwordExpiryDays}
                  onChange={(e) => handleChange('passwordExpiryDays', e.target.value === '' ? '' : parseInt(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxFailedAccessAttempts" className="text-sm lg:text-base">Số lần nhập sai tối đa</Label>
                  <Input
                    id="maxFailedAccessAttempts"
                    type="number"
                    min={1}
                    className="text-sm lg:text-base"
                    value={formData.maxFailedAccessAttempts}
                    onChange={(e) => handleChange('maxFailedAccessAttempts', e.target.value === '' ? '' : parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockoutDurationMinutes" className="text-sm lg:text-base">Khóa tạm thời (Phút)</Label>
                  <Input
                    id="lockoutDurationMinutes"
                    type="number"
                    min={1}
                    className="text-sm lg:text-base"
                    value={formData.lockoutDurationMinutes}
                    onChange={(e) => handleChange('lockoutDurationMinutes', e.target.value === '' ? '' : parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="lg:text-xl">Kiểm soát Truy cập (IP Whitelist)</CardTitle>
              <CardDescription className="text-sm lg:text-base">Giới hạn địa chỉ mạng được phép truy cập, quản lý từ xa.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="allowedAdminIPs" className="text-sm lg:text-base">Danh sách IP (phân cách bằng dấu phẩy)</Label>
                <Textarea
                  id="allowedAdminIPs"
                  placeholder="Ví dụ: 192.168.1.100, 113.190.233.10"
                  className="min-h-25 text-sm lg:text-base"
                  value={formData.allowedAdminIPs || ''}
                  onChange={(e) => handleChange('allowedAdminIPs', e.target.value)}
                />
                <div className="text-sm lg:text-base text-muted-foreground">
                  Để trống nếu bạn muốn cho phép truy cập từ mọi địa chỉ mạng.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
