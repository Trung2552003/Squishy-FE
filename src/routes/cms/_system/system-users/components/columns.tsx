import type { ColumnDef } from '@tanstack/react-table'
import type { UserDto } from '@/lib/api/system/user'
import { Button } from '@/components/ui/button'
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn, getAvatarColor, getFileUrl } from '@/lib/utils'
import { userApi } from '@/lib/api/system/user'
import { useQuery } from '@tanstack/react-query'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

const UserRolesCell = ({ userId }: { userId: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['userRoles', userId],
    queryFn: () => userApi.getUserRoles(userId)
  })

  if (isLoading) return <span className="text-muted-foreground/70 text-sm">...</span>

  const roles = data?.data?.filter((r: any) => r.isGranted) || []
  if (roles.length === 0) return <span className="text-muted-foreground/70 text-sm italic">Chưa phân quyền</span>

  return (
    <div className="flex flex-wrap gap-1 max-w-62.5">
      {roles.map((role: any) => (
        <span key={role.roleId} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
          {role.name}
        </span>
      ))}
    </div>
  )
}

interface ColumnProps {
  onEdit: (data: UserDto) => void
  onDelete: (id: string) => void
  checkPermission: (code: string) => boolean
}

export const getColumns = ({ onEdit, onDelete, checkPermission }: ColumnProps): ColumnDef<UserDto>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <div className="flex justify-center w-full">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-0.5"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center w-full">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-0.5"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    meta: { className: "w-[48px] px-0" },
  },
  {
    id: 'account',
    accessorFn: (row) => row.userName,
    header: 'Tài khoản',
    meta: { className: 'w-65 min-w-65' },
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-3 w-65 min-w-65">
          <div className={cn("h-10 w-10 rounded-full border border-border overflow-hidden flex items-center justify-center shrink-0 shadow-sm", user.avatarPath ? "bg-muted/50" : getAvatarColor(user.userName))}>
            {user.avatarPath ? (
              <img src={getFileUrl(user.avatarPath)} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-white">{user.userName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-medium text-[15px] leading-tight wrap-break-word whitespace-normal">{user.userName}</span>
            {user.name && <span className="text-[13px] mt-0.5 wrap-break-word whitespace-normal">Tên: {user.name}</span>}
          </div>
        </div>
      )
    },
  },
  {
    id: 'roles',
    enableSorting: false,
    header: 'Vai trò',
    meta: { className: 'w-65 min-w-65' },
    cell: ({ row }) => (
      <div className="w-65 min-w-65">
        <UserRolesCell userId={row.original.id} />
      </div>
    ),
  },
  {
    id: 'status',
    enableSorting: false,
    accessorFn: (row) => row.isActive,
    header: () => <div className="flex-1 text-center">Trạng thái</div>,
    meta: { className: 'w-32 min-w-32 text-center' },
    cell: ({ row }) => {
      const isActive = row.original.isActive;
      return (
        <div className="flex justify-center">
          {isActive ? (
            <Badge className="px-3 py-3 text-xs bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 font-medium hover:bg-emerald-500/20">
              Hoạt động
            </Badge>
          ) : (
            <Badge className="px-3 py-3 text-xs bg-rose-500/15 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 font-medium hover:bg-rose-500/20">
              Đã khóa
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    meta: { className: 'w-45 min-w-45' },
    cell: ({ row }) => {
      const email = row.getValue('email') as string || '';
      if (email.length > 25) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-[15px] truncate w-45 min-w-45 cursor-help">
                  {email}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      return <div className="text-[15px] w-45 min-w-45 truncate">{email}</div>;
    },
  },
  {
    enableSorting: false,
    accessorKey: 'phoneNumber',
    header: 'Số điện thoại',
    meta: { className: 'w-32 min-w-32' },
    cell: ({ row }) => <div className="text-[15px]">{row.getValue('phoneNumber') || ''}</div>,
  },
  {
    id: 'actions',
    enableSorting: false,
    header: () => <div className="flex justify-center w-full">Thao tác</div>,
    meta: { className: 'w-24 min-w-24' },
    cell: ({ row }) => {
      const user = row.original

      return (
        <div className="flex items-center justify-center gap-2">
          {checkPermission('SystemUser_Edit') && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => onEdit(user)}
              title="Chỉnh sửa"
            >
              <PencilSimpleIcon className="h-4 w-4" />
            </Button>
          )}
          {checkPermission('SystemUser_Delete') && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-red-600 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:bg-red-500/10"
              onClick={() => onDelete(user.id)}
              title="Xóa"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    },
  },
]
