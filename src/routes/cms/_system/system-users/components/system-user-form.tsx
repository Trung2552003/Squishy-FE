import React, { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { userSchema, type UserPayload, type UserDto } from "@/lib/api/system/user"
import { userApi } from "@/lib/api/system/user"
import type { SystemRole } from "@/lib/api/system/systemRole"
import { Checkbox } from "@/components/ui/checkbox"
import { FloppyDiskIcon, CircleNotchIcon, PencilSimpleIcon, XIcon, EyeIcon, EyeClosedIcon, CameraIcon } from "@phosphor-icons/react"
import { uploadApi } from "@/lib/api/upload"
import { getFileUrl, getAvatarColor, cn } from "@/lib/utils"
import { toast } from "sonner"

interface SystemUserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: UserDto | null
  onSubmit: (data: UserPayload) => void
  isSubmitting?: boolean
  allRoles: SystemRole[]
  apiError?: { field: string; message: string } | null
}

export function SystemUserForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting = false,
  allRoles,
  apiError,
}: SystemUserFormProps) {
  const isEditing = !!initialData
  const [isFetchingRoles, setIsFetchingRoles] = useState(false)
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isAvatarDeleted, setIsAvatarDeleted] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const form = useForm<UserPayload>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      userName: "",
      password: "",
      name: "",
      email: "",
      phoneNumber: "",
      avatarPath: null,
      isActive: true,
      roleIds: [],
    },
  })

  useEffect(() => {
    if (open) {
      setShowPassword(false)
      if (initialData) {
        setIsFetchingRoles(true)
        userApi.getUserRoles(initialData.id)
          .then((res: any) => {
            const roleData = res.data || []
            const roleIds = roleData.filter((x: any) => x.isGranted).map((x: any) => x.roleId)

            form.reset({
              userName: initialData.userName || "",
              password: "",
              name: initialData.name || "",
              email: initialData.email || "",
              phoneNumber: initialData.phoneNumber || "",
              avatarPath: initialData.avatarPath || null,
              isActive: initialData.isActive ?? true,
              roleIds: roleIds,
            })
            setAvatarPreview(initialData.avatarPath ? getFileUrl(initialData.avatarPath) : null)
            setAvatarFile(null)
            setIsAvatarDeleted(false)
          })
          .catch(() => {
            form.reset({
              userName: initialData.userName || "",
              password: "",
              name: initialData.name || "",
              email: initialData.email || "",
              phoneNumber: initialData.phoneNumber || "",
              avatarPath: initialData.avatarPath || null,
              isActive: initialData.isActive ?? true,
              roleIds: [],
            })
            setAvatarPreview(initialData.avatarPath ? getFileUrl(initialData.avatarPath) : null)
            setAvatarFile(null)
            setIsAvatarDeleted(false)
          })
          .finally(() => setIsFetchingRoles(false))
      } else {
        form.reset({
          userName: "",
          password: "Qlkc123@",
          name: "",
          email: "",
          phoneNumber: "",
          avatarPath: null,
          isActive: true,
          roleIds: [],
        })
        setAvatarPreview(null)
        setAvatarFile(null)
        setIsAvatarDeleted(false)
      }
    }
  }, [open, initialData, form])

  useEffect(() => {
    if (apiError) {
      form.setError(apiError.field as keyof UserPayload, {
        type: 'server',
        message: apiError.message,
      })
    }
  }, [apiError, form])

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    const current = form.getValues("roleIds") || []
    if (checked) {
      form.setValue("roleIds", [...current, roleId], { shouldDirty: true })
    } else {
      form.setValue("roleIds", current.filter(id => id !== roleId), { shouldDirty: true })
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Dung lượng file ảnh tối đa là 10MB');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setIsAvatarDeleted(false);
      form.setValue('avatarPath', null, { shouldDirty: true });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsAvatarDeleted(true);
    form.setValue('avatarPath', null, { shouldDirty: true });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleFormSubmit = async (data: UserPayload) => {
    try {
      let finalAvatarPath = data.avatarPath;
      if (avatarFile) {
        const res: any = await uploadApi.uploadAvatar(avatarFile);
        if (res.isSuccess) {
          finalAvatarPath = res.data;
        } else {
          toast.error("Tải ảnh lên thất bại.");
          return;
        }
      } else if (isAvatarDeleted) {
        finalAvatarPath = null;
      }

      data.avatarPath = finalAvatarPath;
      onSubmit(data)
    } catch (error) {
      console.error(error)
      toast.error("Tải ảnh lên thất bại.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Cập nhật người dùng" : "Thêm mới người dùng"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form id="user-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <div className="space-y-4">

              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className={cn("w-24 h-24 rounded-full overflow-hidden border-2 border-border/50 shadow-sm flex items-center justify-center bg-muted/50 relative", !(avatarPreview || (form.watch("avatarPath") && !isAvatarDeleted)) && getAvatarColor(form.watch("userName") || ""))}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (form.watch("avatarPath") && !isAvatarDeleted) ? (
                      <img src={getFileUrl(form.watch("avatarPath"))} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-white">{form.watch("userName")?.charAt(0)?.toUpperCase() || "?"}</span>
                    )}

                    <div
                      onClick={handleAvatarClick}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <CameraIcon className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {(avatarPreview || (form.watch("avatarPath") && !isAvatarDeleted)) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="absolute top-0 right-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-10 opacity-0 group-hover:opacity-100"
                      title="Xóa ảnh"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
                <span className="text-xs text-muted-foreground mt-2">Ảnh đại diện</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="userName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center h-5">Tài khoản <span className="text-red-500 ml-1">*</span></FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tài khoản"
                          {...field}
                          disabled={isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center h-5">
                        Mật khẩu
                        {isEditing ? (
                          <span className="text-muted-foreground/70 text-xs font-normal ml-1">(Không thể đổi)</span>
                        ) : (
                          <span className="text-muted-foreground/70 text-xs font-normal ml-1">(Mặc định: Qlkc123@)</span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <div className="relative w-full">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Mật khẩu"
                            {...field}
                            disabled={isEditing}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/70 hover:text-muted-foreground transition-colors focus:outline-none"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeIcon className="h-5 w-5" />
                            ) : (
                              <EyeClosedIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center h-5">Họ và tên</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Họ và tên"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center h-5">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Email"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center h-5">Số điện thoại</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Số điện thoại"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="invisible flex items-center h-5">Trạng thái</FormLabel>
                        <div className="inline-flex flex-row items-center space-x-2.5 rounded-lg border border-input px-3 h-8 w-full justify-start">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer font-normal text-sm">
                            Kích hoạt tài khoản
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
            </div>

            {/* Phân quyền vai trò */}
            <div className="space-y-3">
              <FormLabel>Phân quyền vai trò</FormLabel>

              {isFetchingRoles ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Đang tải phân quyền...</div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden bg-card">
                  <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 gap-0">
                    {allRoles.map((role) => {
                      const isChecked = (form.watch("roleIds") || []).includes(role.id)

                      return (
                        <div
                          key={role.id}
                          className="flex items-center space-x-3 p-3 border-r border-b border-border/50 hover:bg-muted/50 transition-colors last:border-r-0"
                        >
                          <Checkbox
                            id={`role-${role.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => handleRoleToggle(role.id, !!checked)}
                          />
                          <div className="leading-none">
                            <label
                              htmlFor={`role-${role.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {role.name}
                            </label>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="mt-6 pt-4 border-t border-border/50">
              <Button variant="outline" onClick={() => onOpenChange(false)} type="button" className="h-10 min-w-30 rounded-lg">
                <XIcon className="w-4 h-4 mr-2" />
                Hủy bỏ
              </Button>
              <Button type="submit" form="user-form" disabled={isSubmitting || isFetchingRoles} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-10 min-w-30 rounded-lg">
                {isSubmitting ? (
                  <CircleNotchIcon className="w-4 h-4 mr-2 animate-spin" />
                ) : isEditing ? (
                  <PencilSimpleIcon className="w-4 h-4 mr-2" />
                ) : (
                  <FloppyDiskIcon className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? "Đang lưu..." : isEditing ? "Cập nhật" : "Lưu lại"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
