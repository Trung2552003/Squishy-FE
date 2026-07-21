import React, { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
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
import { userApi, type UserDto } from "@/lib/api/system/user"
import { FloppyDiskIcon, CircleNotchIcon, XIcon, CameraIcon } from "@phosphor-icons/react"
import { uploadApi } from "@/lib/api/upload"
import { getFileUrl, getAvatarColor, cn } from "@/lib/utils"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

const profileSchema = z.object({
  userName: z.string().min(1, "Tài khoản không được để trống"),
  name: z.string().optional().nullable(),
  email: z.string().email("Email không hợp lệ").optional().nullable().or(z.literal('')),
  phoneNumber: z.string().optional().nullable(),
  avatarPath: z.string().optional().nullable(),
});

type ProfilePayload = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: UserDto | null
}

export function ProfileForm({
  open,
  onOpenChange,
  currentUser,
}: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isAvatarDeleted, setIsAvatarDeleted] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const form = useForm<ProfilePayload>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      userName: "",
      name: "",
      email: "",
      phoneNumber: "",
      avatarPath: null,
    },
  })

  useEffect(() => {
    if (open && currentUser) {
      form.reset({
        userName: currentUser.userName || "",
        name: currentUser.name || "",
        email: currentUser.email || "",
        phoneNumber: currentUser.phoneNumber || "",
        avatarPath: currentUser.avatarPath || null,
      })
      setAvatarPreview(currentUser.avatarPath ? getFileUrl(currentUser.avatarPath) : null)
      setAvatarFile(null)
      setIsAvatarDeleted(false)
    }
  }, [open, currentUser, form])

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

  const handleFormSubmit = async (data: ProfilePayload) => {
    if (!currentUser) return;
    setIsSubmitting(true);

    try {
      let finalAvatarPath = data.avatarPath;
      if (avatarFile) {
        const res: any = await uploadApi.uploadAvatar(avatarFile);
        if (res.isSuccess) {
          finalAvatarPath = res.data;
        } else {
          toast.error("Tải ảnh lên thất bại.");
          setIsSubmitting(false);
          return;
        }
      } else if (isAvatarDeleted) {
        finalAvatarPath = null;
      }

      data.avatarPath = finalAvatarPath;

      const payload = {
        ...data,
        isActive: currentUser.isActive,
        roleIds: []
      };

      const res: any = await userApi.update(currentUser.id, payload);

      if (res.isSuccess) {
        toast.success("Cập nhật thông tin thành công!");
        queryClient.invalidateQueries({ queryKey: ['me'] });
        queryClient.invalidateQueries({ queryKey: ['systemUsers'] });
        onOpenChange(false);
      } else {
        toast.error(res.message || "Cập nhật thất bại");
      }
    } catch (error) {
      console.error(error)
      toast.error("Có lỗi xảy ra khi cập nhật thông tin.")
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125 max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Cài đặt tài khoản
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <Form {...form}>
            <form id="profile-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
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

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="userName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Tài khoản <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tài khoản"
                          {...field}
                          className="bg-muted/30 text-muted-foreground cursor-not-allowed"
                          disabled
                        />
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
                      <FormLabel className="text-foreground">Họ và tên</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Họ và tên"
                          {...field}
                          value={field.value || ''}
                          className="bg-muted/30"
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
                      <FormLabel className="text-foreground">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Email"
                          {...field}
                          value={field.value || ''}
                          className="bg-muted/30"
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
                      <FormLabel className="text-foreground">Số điện thoại</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Số điện thoại"
                          {...field}
                          value={field.value || ''}
                          className="bg-muted/30"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>

        <div className="px-6 py-4 border-t border-border/50 bg-muted/30 flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            <XIcon className="w-4 h-4 mr-2" />
            Hủy bỏ
          </Button>
          <Button type="submit" form="profile-form" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm min-w-30">
            {isSubmitting ? (
              <CircleNotchIcon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FloppyDiskIcon className="w-4 h-4 mr-2" />
            )}
            {isSubmitting ? "Đang lưu..." : "Lưu lại"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
