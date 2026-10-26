import React, { useEffect } from 'react'
import { createFileRoute, Outlet, Link, useLocation, useNavigate, redirect, Navigate } from '@tanstack/react-router'
import * as signalR from '@microsoft/signalr'
import { toast } from 'sonner'
import {
  CaretDownIcon,
  GearIcon,
  SignOutIcon,
} from '@phosphor-icons/react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { systemFunctionApi, type SystemFunction } from '@/lib/api/system/systemFunction'
import { userApi, type UserDto } from '@/lib/api/system/user'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, getThumbUrl } from '@/lib/utils'
import { ProfileForm } from '@/components/profile-form'
import { ChangePasswordForm } from '@/components/change-password-form'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { authApi } from '@/lib/api/system/auth'
import { Mascot, SparkleDoodle } from '@/components/shop/mascot'
import { MascotTip } from '@/components/shop/mascot-tip'

export const Route = createFileRoute('/cms')({
  beforeLoad: () => {
    if (typeof window !== 'undefined' && !localStorage.getItem('userName')) {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: CmsLayout,
})

// Mỗi nhóm menu một màu kẹo
const CANDY_COLORS = ['#FFD6E0', '#FEF08A', '#BAE6FD', '#BBF7D0', '#DDD6FE', '#FED7AA', '#A5F3FC']

const NAV_ITEM_CLASS =
  "group h-auto min-h-10 w-full rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-700 whitespace-normal border-2 border-transparent transition-all cursor-pointer hover:bg-white/80 hover:text-slate-900 data-[active=true]:bg-white data-[active=true]:text-slate-900 data-[active=true]:font-bold data-[active=true]:border-slate-800 data-[active=true]:shadow-[2px_2px_0_#1e293b] data-[active=true]:-rotate-1"

function SidebarNavItem({ item, functions, location, color, isSubItem = false }: { item: SystemFunction, functions: SystemFunction[], location: any, color: string, isSubItem?: boolean }) {
  const children = functions
    .filter(f => f.isShow && f.type !== 'button' && f.parentId === item.id)
    .sort((a, b) => a.order - b.order)

  const cleanName = item.name.replace(/^\|\s*([—-]\s*)*/, '')
  const iconName = item.icon
  const Icon = (iconName && ((PhosphorIcons as any)[iconName] || (PhosphorIcons as any)[`${iconName}Icon`])) || (PhosphorIcons as any).PackageIcon || (PhosphorIcons as any).SparkleIcon

  const hasActiveChild = (items: SystemFunction[]): boolean => {
    return items.some(child => {
      if (child.url && location.pathname.replace(/\/$/, '').startsWith(child.url.replace(/\/$/, ''))) return true;
      const childChildren = functions.filter(f => f.isShow && f.type !== 'button' && f.parentId === child.id);
      return hasActiveChild(childChildren);
    });
  }

  const isOpen = hasActiveChild(children);
  const Wrapper = isSubItem ? SidebarMenuSubItem : SidebarMenuItem
  const ButtonWrapper = isSubItem ? SidebarMenuSubButton : SidebarMenuButton

  // Icon nằm trong bong bóng tròn màu kẹo, lắc nhẹ khi rê chuột
  const iconEl = Icon && (
    <span
      className={cn(
        "nav-bubble shrink-0 rounded-full border-[1.5px] border-slate-800 flex items-center justify-center",
        isSubItem ? "w-6 h-6" : "w-7 h-7"
      )}
      style={{ backgroundColor: color }}
    >
      <Icon weight="bold" className={cn("text-slate-800", isSubItem ? "w-3.5 h-3.5" : "w-4 h-4")} />
    </span>
  )
  // Tên dài được xuống dòng (tối đa 2 dòng) thay vì bị cắt "..."
  const labelEl = <span className="flex-1 min-w-0 text-left leading-snug line-clamp-2 break-words" title={cleanName}>{cleanName}</span>

  if (children.length > 0) {
    return (
      <Collapsible className="group/collapsible" defaultOpen={isOpen}>
        <Wrapper>
          <CollapsibleTrigger asChild>
            <ButtonWrapper
              isActive={false}
              className={cn(NAV_ITEM_CLASS, "flex items-center gap-2.5", isOpen && "text-slate-900")}
            >
              {iconEl}
              {labelEl}
              <PhosphorIcons.CaretDownIcon className="ml-auto w-3.5 h-3.5 text-slate-500 transition-transform group-data-[state=open]/collapsible:rotate-180 shrink-0" weight="bold" />
            </ButtonWrapper>
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-in slide-in-from-top-1">
            <SidebarMenuSub className="ml-5 mr-0 pl-2 pr-0 mt-0.5 gap-0.5 border-l-2 border-dashed border-slate-300">
              {children.map(child => (
                <SidebarNavItem key={child.id} item={child} functions={functions} location={location} color={color} isSubItem={true} />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Wrapper>
      </Collapsible>
    )
  }

  return (
    <Wrapper>
      <ButtonWrapper
        asChild
        isActive={location.pathname.replace(/\/$/, '') === (item.url || '').replace(/\/$/, '')}
        className={NAV_ITEM_CLASS}
      >
        <Link to={item.url || '#'} className="flex items-center gap-2.5 w-full">
          {iconEl}
          {labelEl}
        </Link>
      </ButtonWrapper>
    </Wrapper>
  )
}

function CmsSidebar({ userName }: { userName: string }) {
  const location = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

  // Trên điện thoại: tự đóng menu sau khi chuyển trang
  useEffect(() => {
    if (isMobile) setOpenMobile(false)
  }, [location.pathname, isMobile, setOpenMobile])

  const { data: allData, isLoading } = useQuery({
    queryKey: ['systemFunctionsMy'],
    queryFn: systemFunctionApi.getMyFunctions,
  })

  const functions: SystemFunction[] = allData?.data || []

  const rootItems = functions
    .filter(f => f.isShow && f.type !== 'button' && (!f.parentId || f.parentId === "00000000-0000-0000-0000-000000000000"))
    .sort((a, b) => a.order - b.order)

  return (
    <Sidebar variant="floating" className="cms-sidebar lg:p-3 lg:pr-1">
      <SidebarHeader className="px-4 pt-4 pb-2 flex flex-row items-center bg-transparent shrink-0">
        <Link to="/cms/dashboard" className="flex items-center gap-2.5 w-full group">
          <div className="relative w-10 h-10 rounded-2xl bg-[#FFB4B4] border-2 border-slate-800 shadow-[2px_2px_0_#1e293b] flex items-center justify-center -rotate-6 group-hover:rotate-6 transition-transform shrink-0">
            <PhosphorIcons.SparkleIcon className="w-5 h-5 text-slate-900" weight="fill" />
            <SparkleDoodle className="twinkle absolute -top-2 -right-2 w-3.5 h-3.5 text-[#FEF08A]" />
          </div>
          <div className="min-w-0 leading-tight">
            <span className="text-base font-black text-slate-900 block truncate">Squishy Pop</span>
            <span className="text-xs font-semibold text-slate-500 block truncate">Quản trị cửa hàng 🎀</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 pb-2 bg-transparent scrollbar-thin">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Mascot mood="happy" size={48} className="mochi-hop" />
          </div>
        ) : (
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {rootItems.map((item, idx) => (
                  <SidebarNavItem key={item.id} item={item} functions={functions} location={location} color={CANDY_COLORS[idx % CANDY_COLORS.length]} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="px-4 pb-4 pt-0 bg-transparent shrink-0 [@media(max-height:700px)]:hidden">
        <MascotTip userName={userName} />
      </SidebarFooter>
    </Sidebar>
  )
}

function CmsLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false)

  const { data: myData } = useQuery({
    queryKey: ['me'],
    queryFn: userApi.getMe,
    // refetchInterval: 30000,
    refetchOnWindowFocus: true,
  })

  const currentUser = myData?.data as UserDto | null

  const fallbackUserName = typeof window !== 'undefined' ? (localStorage.getItem('userName') || 'Lỗi') : 'Lỗi'

  const displayUserName = currentUser?.userName || fallbackUserName
  const avatarPath = currentUser?.avatarPath || null

  const initial = displayUserName.charAt(0).toUpperCase()

  const { data: allData, isSuccess, isLoading } = useQuery({
    queryKey: ['systemFunctionsMy'],
    queryFn: systemFunctionApi.getMyFunctions,
  })

  const functions: SystemFunction[] = allData?.data || []

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error(error)
    } finally {
      queryClient.clear()
      localStorage.removeItem('userName')
      navigate({ to: '/login' })
    }
  }

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
    const hubUrl = `${baseUrl}/hubs/app`;
    
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ForceLogout", () => {
      toast.error("Phiên đăng nhập đã kết thúc do tài khoản của bạn đã bị khóa bởi Quản trị viên");
      setTimeout(() => {
        handleLogout();
      }, 5000);
    });

    connection.on("PermissionsUpdated", () => {
      toast.info("Quyền truy cập của bạn vừa được cập nhật. Đang tải lại trang...", { duration: 5000 });
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    });

    connection.on("ProfileUpdated", () => {
      toast.info("Thông tin tài khoản vừa được thay đổi bởi Quản trị viên", { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    });

    connection.on("RolePermissionsUpdated", (senderId?: string) => {
      const meData: any = queryClient.getQueryData(['me']);
      const currentUserId = meData?.data?.id;
      
      if (!currentUserId || senderId !== currentUserId) {
        toast.info("Phân quyền hệ thống vừa được cập nhật. Đang tải lại trang...", { duration: 5000 });
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }
    });

    connection.on("EntityChanged", (entityName: string, senderId?: string) => {
      // Phát event cho các component đang mở (ví dụ useEntityRefresh)
      window.dispatchEvent(new CustomEvent('EntityChanged', { detail: { entityName, senderId } }));

      // Map entityName sang queryKey tương ứng
      let queryKey = '';
      if (entityName === 'SystemUser') queryKey = 'systemUsers';
      if (entityName === 'SystemRole') queryKey = 'systemRoles';
      if (entityName === 'SystemFunction') queryKey = 'systemFunctions';

      const meData: any = queryClient.getQueryData(['me']);
      const currentUserId = meData?.data?.id;
      
      if (queryKey && (!currentUserId || senderId !== currentUserId)) {
        queryClient.invalidateQueries({ queryKey: [queryKey], refetchType: 'none' });
        queryClient.invalidateQueries({ queryKey: [queryKey, 'all'] });

        if (entityName === 'SystemUser') {
          queryClient.invalidateQueries({ queryKey: ['userRoles'], refetchType: 'none' });
        }
        if (entityName === 'SystemRole') {
          queryClient.invalidateQueries({ queryKey: ['systemRolesAll'], refetchType: 'none' });
          queryClient.invalidateQueries({ queryKey: ['systemFunctionsMy'], refetchType: 'none' });
        }
        if (entityName === 'SystemFunction') {
          toast.info("Menu vừa được cập nhật. Đang tải lại trang...", { duration: 5000 });
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        }
      }
    });

    connection.start().catch(err => console.error("SignalR Connection Error: ", err));

    return () => {
      connection.stop();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-muted/50">
        <PhosphorIcons.CircleNotchIcon className="w-8 h-8 animate-spin text-muted-foreground/70" />
      </div>
    )
  }

  // Bảo mật: Chống truy cập trực tiếp qua URL nếu không có quyền
  if (isSuccess && location.pathname.startsWith('/cms') && location.pathname !== '/cms' && location.pathname !== '/cms/' && location.pathname !== '/cms/dashboard') {
    const normalizedPath = location.pathname.replace(/\/$/, '')
    const isAllowed = functions.some(f => f.url && normalizedPath.startsWith(f.url.replace(/\/$/, '')));
    if (!isAllowed) {
      return <Navigate to="/cms" replace />
    }
  }

  const breadcrumb: string[] = []
  const currentFunc = functions.find(f => f.url && location.pathname.replace(/\/$/, '').startsWith(f.url.replace(/\/$/, '')))
  if (currentFunc) {
    if (currentFunc.parentId && currentFunc.parentId !== "00000000-0000-0000-0000-000000000000") {
      const parent = functions.find(f => f.id === currentFunc.parentId)
      if (parent) {
        breadcrumb.push(parent.name.replace(/^\|\s*([—-]\s*)*/, ''))
      }
    }
    breadcrumb.push(currentFunc.name.replace(/^\|\s*([—-]\s*)*/, ''))
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "17rem" } as React.CSSProperties}>
      <div className="flex h-svh w-full doodle-pattern text-foreground font-sans overflow-hidden">
        <CmsSidebar userName={displayUserName} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-svh overflow-hidden">
          {/* Thanh trên: tên trang hiện tại + tài khoản */}
          <header className="scallop-bottom h-14 flex items-center justify-between gap-2 px-3 sm:px-5 z-20 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <SidebarTrigger className="rounded-xl bg-white border-2 border-slate-800 shadow-[2px_2px_0_#1e293b] hover:bg-[#FEF08A] p-1.5 cursor-pointer h-9 w-9 shrink-0" />
              <div className="h-5 w-px bg-slate-200 hidden sm:block" />
              <nav className="flex items-center gap-1.5 min-w-0 text-sm" aria-label="Breadcrumb">
                {breadcrumb.length === 0 ? (
                  <span className="font-bold text-slate-900 truncate">Bảng điều khiển</span>
                ) : (
                  breadcrumb.map((item, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <PhosphorIcons.CaretRightIcon className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />}
                      <span className={index === breadcrumb.length - 1 ? "font-bold text-slate-900 truncate" : "text-slate-500 truncate hidden sm:inline"}>
                        {item}
                      </span>
                    </React.Fragment>
                  ))
                )}
              </nav>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto shrink-0">
              {/* Storefront Link */}
              <Link
                to="/"
                title="Xem cửa hàng"
                className="flex items-center gap-1.5 text-slate-700 hover:bg-slate-100 rounded-lg h-9 w-9 md:w-auto justify-center md:px-3 text-sm font-semibold transition-colors"
              >
                <PhosphorIcons.StorefrontIcon className="w-4 h-4" weight="bold" />
                <span className="hidden md:inline">Xem cửa hàng</span>
              </Link>

              {/* User Account Capsule matching Reference Image 1 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full h-9 pl-1 pr-2 sm:pr-3 flex items-center gap-2 hover:bg-slate-100 transition-colors cursor-pointer">
                    <Avatar className="w-7 h-7 border-1.5 border-black">
                      {avatarPath ? (
                        <img src={getThumbUrl(avatarPath, 160)} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <AvatarFallback className="bg-[#BAE6FD] text-black font-black text-[11px]">
                          {initial}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="hidden sm:block text-sm font-semibold text-slate-900 max-w-32 truncate">{displayUserName}</span>
                    <CaretDownIcon className="w-3.5 h-3.5 text-slate-500" weight="bold" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 mt-1 rounded-xl border border-slate-200 shadow-lg p-1.5 bg-white">
                  <DropdownMenuLabel className="font-medium text-xs text-slate-500">
                    Đăng nhập với
                    <span className="block text-sm font-bold text-slate-900 truncate mt-0.5">{displayUserName}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-200" />
                  <DropdownMenuItem className="cursor-pointer font-medium text-sm rounded-lg py-2 hover:bg-[#FAF7EE]" onClick={() => setIsProfileOpen(true)}>
                    <GearIcon className="mr-2 w-4 h-4" weight="bold" />
                    <span>Cài đặt tài khoản</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer font-medium text-sm rounded-lg py-2 hover:bg-[#FAF7EE]" onClick={() => setIsChangePasswordOpen(true)}>
                    <PhosphorIcons.LockKeyIcon className="mr-2 w-4 h-4" weight="bold" />
                    <span>Đổi mật khẩu</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-200" />
                  <DropdownMenuItem className="cursor-pointer font-medium text-sm rounded-lg py-2 text-red-600 focus:text-red-600 focus:bg-red-50 hover:bg-red-50" onClick={handleLogout}>
                    <SignOutIcon className="mr-2 w-4 h-4" weight="bold" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-5 sm:px-5 sm:pb-5 sm:pt-7 lg:px-6 scrollbar-thin">
            <Outlet />
          </main>

        </div>
      </div>
      
      {currentUser && (
        <>
          <ProfileForm 
            open={isProfileOpen} 
            onOpenChange={setIsProfileOpen} 
            currentUser={currentUser} 
          />
          <ChangePasswordForm
            open={isChangePasswordOpen}
            onOpenChange={setIsChangePasswordOpen}
            currentUser={currentUser}
          />
        </>
      )}
    </SidebarProvider>
  )
}
