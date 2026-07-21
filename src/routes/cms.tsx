import React, { useEffect } from 'react'
import { createFileRoute, Outlet, Link, useLocation, useNavigate, redirect, Navigate } from '@tanstack/react-router'
import { useTheme } from 'next-themes'
import * as signalR from '@microsoft/signalr'
import { toast } from 'sonner'
import {
  BellIcon,
  CaretDownIcon,
  GearIcon,
  SignOutIcon,
} from '@phosphor-icons/react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { systemFunctionApi, type SystemFunction } from '@/lib/api/system/systemFunction'
import { userApi, type UserDto } from '@/lib/api/system/user'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, getAvatarColor, getFileUrl } from '@/lib/utils'
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
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { authApi } from '@/lib/api/system/auth'

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

function SidebarNavItem({ item, functions, location, isSubItem = false }: { item: SystemFunction, functions: SystemFunction[], location: any, isSubItem?: boolean }) {
  const children = functions
    .filter(f => f.isShow && f.type !== 'button' && f.parentId === item.id)
    .sort((a, b) => a.order - b.order)

  const cleanName = item.name.replace(/^\|\s*([—-]\s*)*/, '')
  const iconName = item.icon
  const Icon = iconName && (PhosphorIcons as any)[iconName] ? (PhosphorIcons as any)[iconName] : null

  const hasActiveChild = (items: SystemFunction[]): boolean => {
    return items.some(child => {
      if (child.url && location.pathname.replace(/\/$/, '').startsWith(child.url.replace(/\/$/, ''))) return true;
      const childChildren = functions.filter(f => f.isShow && f.type !== 'button' && f.parentId === child.id);
      return hasActiveChild(childChildren);
    });
  }

  const isOpen = hasActiveChild(children);

  if (children.length > 0) {
    const Wrapper = isSubItem ? SidebarMenuSubItem : SidebarMenuItem
    const ButtonWrapper = isSubItem ? SidebarMenuSubButton : SidebarMenuButton

    return (
      <Collapsible className="group/collapsible" defaultOpen={isOpen}>
        <Wrapper>
          <CollapsibleTrigger asChild>
            <ButtonWrapper
              isActive={item.url ? location.pathname.replace(/\/$/, '').startsWith(item.url.replace(/\/$/, '')) : false}
              className="group h-auto py-2.5 px-3 text-[15px] font-bold text-foreground hover:bg-blue-50 hover:text-blue-600 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 dark:data-[active=true]:bg-blue-500/10 dark:data-[active=true]:text-blue-400 rounded-lg w-full flex items-center transition-colors"
            >
              {Icon && <Icon weight="regular" className={cn("shrink-0 transition-colors text-muted-foreground group-hover:text-current group-data-[active=true]:text-current", isSubItem ? "w-4 h-4 mr-2" : "w-5 h-5 mr-2")} />}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate flex-1 text-left">{cleanName}</span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="z-100">
                    {cleanName}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <PhosphorIcons.CaretDownIcon className="ml-auto w-4 h-4 text-muted-foreground/70 transition-transform group-data-[state=open]:rotate-180 shrink-0" />
            </ButtonWrapper>
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-in slide-in-from-top-1">
            <SidebarMenuSub className="pl-4 ml-2 mt-1">
              {children.map(child => (
                <SidebarNavItem key={child.id} item={child} functions={functions} location={location} isSubItem={true} />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Wrapper>
      </Collapsible>
    )
  }

  const Wrapper = isSubItem ? SidebarMenuSubItem : SidebarMenuItem
  const ButtonWrapper = isSubItem ? SidebarMenuSubButton : SidebarMenuButton

  return (
    <Wrapper>
      <ButtonWrapper
        asChild
        isActive={location.pathname.replace(/\/$/, '') === (item.url || '').replace(/\/$/, '')}
        className="group h-auto py-2.5 text-[15px] font-bold text-foreground hover:bg-blue-50 hover:text-blue-600 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 dark:data-[active=true]:bg-blue-500/10 dark:data-[active=true]:text-blue-400 rounded-lg px-3 w-full transition-colors"
      >
        <Link to={item.url || '#'} className="flex items-center w-full overflow-hidden">
          {Icon && <Icon weight="regular" className={cn("shrink-0 transition-colors text-muted-foreground group-hover:text-current group-data-[active=true]:text-current", isSubItem ? "w-4 h-4 mr-2" : "w-5 h-5 mr-2")} />}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate flex-1 text-left">{cleanName}</span>
              </TooltipTrigger>
              <TooltipContent side="right" className="z-100">
                {cleanName}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Link>
      </ButtonWrapper>
    </Wrapper>
  )
}

function CmsSidebar() {
  const location = useLocation()

  const { data: allData, isLoading } = useQuery({
    queryKey: ['systemFunctionsMy'],
    queryFn: systemFunctionApi.getMyFunctions,
  })

  const functions: SystemFunction[] = allData?.data || []

  const rootItems = functions
    .filter(f => f.isShow && f.type !== 'button' && (!f.parentId || f.parentId === "00000000-0000-0000-0000-000000000000"))
    .sort((a, b) => a.order - b.order)

  return (
    <Sidebar className="bg-card border-r border-border">
      <SidebarHeader className="h-16 px-6 border-b border-border/50 flex items-center justify-center">
        <Link to="/" className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 w-full">
          <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">QC</span>
          </div>
          SystemBase CMS
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <PhosphorIcons.CircleNotchIcon className="w-6 h-6 animate-spin text-muted-foreground/70" />
          </div>
        ) : (
          <SidebarGroup className="mt-2">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {rootItems.map(item => (
                  <SidebarNavItem key={item.id} item={item} functions={functions} location={location} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  )
}

function CmsLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false)
  const { setTheme, theme } = useTheme()

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
  const avatarColorClass = getAvatarColor(displayUserName)

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

  let breadcrumb: string[] = []
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/50 text-foreground font-sans">
        <CmsSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col w-full overflow-hidden">
          {/* Topbar */}
          <header className="h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sticky top-0 z-10 shadow-sm shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-base sm:text-md font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide hidden sm:block">
                SYSTEMBASE CMS
              </h1>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-full relative">
                <BellIcon className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </Button>

              <Separator orientation="vertical" className="h-5" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-full hover:bg-accent">
                    <Avatar className="w-8 h-8 ring-2 ring-white shadow-sm transition-transform hover:scale-105">
                      {avatarPath ? (
                        <img src={getFileUrl(avatarPath)} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <AvatarFallback className={cn(avatarColorClass, "text-white font-semibold text-sm")}>
                          {initial}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-sm font-semibold text-foreground hidden sm:block px-1 tracking-tight">{displayUserName}</span>
                    <CaretDownIcon className="w-4 h-4 text-muted-foreground/70 mr-1 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-1">
                  <DropdownMenuLabel>Thông tin tài khoản</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setIsProfileOpen(true)}>
                    <GearIcon className="mr-2 w-4 h-4" />
                    <span>Cài đặt tài khoản</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setIsChangePasswordOpen(true)}>
                    <PhosphorIcons.LockKeyIcon className="mr-2 w-4 h-4" />
                    <span>Đổi mật khẩu</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <PhosphorIcons.PaletteIcon className="mr-2 w-4 h-4" />
                      <span>Giao diện ({theme === 'dark' ? 'Tối' : theme === 'system' ? 'Hệ thống' : 'Sáng'})</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("light")}>
                          <PhosphorIcons.SunIcon className="mr-2 w-4 h-4" />
                          <span>Sáng</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("dark")}>
                          <PhosphorIcons.MoonIcon className="mr-2 w-4 h-4" />
                          <span>Tối</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("system")}>
                          <PhosphorIcons.MonitorIcon className="mr-2 w-4 h-4" />
                          <span>Hệ thống</span>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:bg-red-500/10" onClick={handleLogout}>
                    <SignOutIcon className="mr-2 w-4 h-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-3 lg:p-3 bg-muted/30 overflow-y-auto">
            <Outlet />
          </main>

          {/* Footer */}
          <footer className="h-12 bg-card border-t border-border flex items-center justify-between px-6 text-sm text-muted-foreground shrink-0">
            <div className="flex items-center gap-2">
              {breadcrumb.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <PhosphorIcons.CaretRightIcon className="w-3.5 h-3.5 text-muted-foreground/70" />}
                  <span className={index === breadcrumb.length - 1 ? "font-bold text-foreground" : "text-muted-foreground"}>
                    {item}
                  </span>
                </React.Fragment>
              ))}
            </div>

            <div className="text-center flex-1 mx-4 hidden md:block">
              2026 &copy; Cục Đổi mới sáng tạo, Chuyển đổi xanh và Khuyến công
            </div>

            <div className="flex items-center gap-4">
              <a href="#" className="flex items-center gap-1 hover:text-foreground transition-colors">
                <PhosphorIcons.QuestionIcon className="w-4 h-4" />
                Hướng dẫn
              </a>
              <a href="#" className="hidden sm:flex items-center gap-1 hover:text-foreground transition-colors">
                <PhosphorIcons.ChatCircleTextIcon className="w-4 h-4" />
                FAQ
              </a>

              <a href="#" className="hidden sm:flex items-center gap-1 hover:text-foreground transition-colors">
                <PhosphorIcons.HeadsetIcon className="w-4 h-4" />
                Hỗ trợ
              </a>

              <a href="#" className="hidden sm:flex items-center gap-1 hover:text-foreground transition-colors">
                <PhosphorIcons.CopyrightIcon className="w-4 h-4" />
                Bản quyền
              </a>
            </div>
          </footer>
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
