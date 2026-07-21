import React, { useState } from "react"
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
import { type UserDto } from "@/lib/api/system/user"
import { FloppyDiskIcon, CircleNotchIcon, XIcon, EyeIcon, EyeClosedIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { authApi } from "@/lib/api/system/auth"
import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  newPassword: z.string().min(1, "Mật khẩu mới không được để trống"),
  confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

type ChangePasswordPayload = z.infer<typeof changePasswordSchema>;

interface ChangePasswordFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: UserDto | null
}

export function ChangePasswordForm({
  open,
  onOpenChange,
  currentUser,
}: ChangePasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const form = useForm<ChangePasswordPayload>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    }
  }, [open, form])

  const handleFormSubmit = async (data: ChangePasswordPayload) => {
    if (!currentUser) return;
    setIsSubmitting(true);

    try {
      const res: any = await authApi.forceChangePassword({
        userName: currentUser.userName,
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });

      if (res.isSuccess) {
        toast.success("Đổi mật khẩu thành công. Vui lòng đăng nhập lại!", {
          duration: 4000,
        });
        await new Promise(resolve => setTimeout(resolve, 1500));
        onOpenChange(false);
        await authApi.logout().catch(() => { });
        queryClient.clear();
        localStorage.removeItem("userName");
        navigate({ to: "/login" });
      } else {
        const errMsg = res.message || "Đổi mật khẩu thất bại";
        const lowerMsg = errMsg.toLowerCase();
        if (lowerMsg.includes("mật khẩu cũ")) {
          form.setError("oldPassword", { type: "server", message: errMsg });
        } else if (lowerMsg.includes("mật khẩu phải") || lowerMsg.includes("mật khẩu mới")) {
          form.setError("newPassword", { type: "server", message: errMsg });
        } else {
          toast.error(errMsg);
        }
      }
    } catch (error: any) {
      console.error(error)
      const errMsg = error.response?.data?.message || "Có lỗi xảy ra khi đổi mật khẩu.";
      const lowerMsg = errMsg.toLowerCase();
      if (lowerMsg.includes("mật khẩu cũ")) {
        form.setError("oldPassword", { type: "server", message: errMsg });
      } else if (lowerMsg.includes("mật khẩu phải") || lowerMsg.includes("mật khẩu mới")) {
        form.setError("newPassword", { type: "server", message: errMsg });
      } else {
        toast.error(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-100 overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Đổi mật khẩu
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <Form {...form}>
            <form id="change-password-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="oldPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Mật khẩu hiện tại <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showOldPassword ? "text" : "password"}
                          placeholder="Nhập mật khẩu hiện tại"
                          {...field}
                          className="bg-muted/30 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/70 hover:text-muted-foreground transition-colors focus:outline-none"
                          tabIndex={-1}
                        >
                          {showOldPassword ? (
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
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Mật khẩu mới <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Nhập mật khẩu mới"
                          {...field}
                          className="bg-muted/30 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/70 hover:text-muted-foreground transition-colors focus:outline-none"
                          tabIndex={-1}
                        >
                          {showNewPassword ? (
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Xác nhận mật khẩu <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Nhập lại mật khẩu mới"
                          {...field}
                          className="bg-muted/30 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/70 hover:text-muted-foreground transition-colors focus:outline-none"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? (
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
            </form>
          </Form>
        </div>

        <div className="px-6 py-4 border-t border-border/50 bg-muted/30 flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            <XIcon className="w-4 h-4 mr-2" />
            Hủy bỏ
          </Button>
          <Button type="submit" form="change-password-form" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm min-w-30">
            {isSubmitting ? (
              <CircleNotchIcon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FloppyDiskIcon className="w-4 h-4 mr-2" />
            )}
            {isSubmitting ? "Đang lưu..." : "Cập nhật"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
