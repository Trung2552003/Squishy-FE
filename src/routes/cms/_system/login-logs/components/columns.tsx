import type { ColumnDef } from '@tanstack/react-table'
import type { LoginLogDto } from '@/lib/api/system/loginLog'
import { Button } from '@/components/ui/button'
import { TrashIcon } from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

interface ColumnProps {
  onDelete: (id: string) => void
  checkPermission: (code: string) => boolean
}

export const getColumns = ({ onDelete, checkPermission }: ColumnProps): ColumnDef<LoginLogDto>[] => [
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
    accessorKey: 'userName',
    header: 'Tài khoản',
    cell: ({ row }) => <div className="">{row.getValue('userName')}</div>,
  },
  {
    enableSorting: false,
    accessorKey: 'ipAddress',
    header: 'Địa chỉ IP',
    cell: ({ row }) => <div className="">{row.getValue('ipAddress')}</div>,
  },
  {
    enableSorting: false,
    accessorKey: 'userAgent',
    header: 'Trình duyệt/Thiết bị',
    meta: { className: 'w-64 min-w-64' },
    cell: ({ row }) => {
      const userAgent = row.getValue('userAgent') as string || '';
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="truncate w-64 min-w-64 cursor-help">
                {userAgent}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-md">
              <p className="text-xs">{userAgent}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    enableSorting: false,
    accessorKey: 'status',
    header: () => <div className="flex-1 text-center">Trạng thái</div>,
    meta: { className: 'text-center' },
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const isSuccess = status === 'Success';
      return (
        <div className="flex justify-center">
          {isSuccess ? (
            <Badge className="px-3 py-3 text-xs bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 font-medium hover:bg-emerald-500/20">
              Thành công
            </Badge>
          ) : (
            <Badge className="px-3 py-3 text-xs bg-rose-500/15 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 font-medium hover:bg-rose-500/20">
              Thất bại
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    enableSorting: false,
    accessorKey: 'message',
    header: 'Thông báo',
    cell: ({ row }) => <div className="truncate max-w-xs">{row.getValue('message')}</div>,
  },
  {
    accessorKey: 'createdAt',
    header: 'Thời gian',
    cell: ({ row }) => {
      const dateStr = row.getValue('createdAt') as string;
      if (!dateStr) return null;
      return <div className="">{new Date(dateStr).toLocaleString('vi-VN')}</div>;
    },
  },
  {
    id: 'actions',
    enableSorting: false,
    header: () => <div className="flex justify-center w-full">Thao tác</div>,
    cell: ({ row }) => {
      const log = row.original
      return (
        <div className="flex items-center justify-center gap-2">
          {checkPermission('LoginLog_Delete') && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-red-600 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:bg-red-500/10"
              onClick={() => onDelete(log.id)}
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
