import type { ColumnDef } from '@tanstack/react-table'
import type { ErrorLogDto } from '@/lib/api/system/errorLog'
import { Button } from '@/components/ui/button'
import { TrashIcon } from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ColumnProps {
  onDelete: (id: string) => void
  checkPermission: (code: string) => boolean
}

export const getColumns = ({ onDelete, checkPermission }: ColumnProps): ColumnDef<ErrorLogDto>[] => [
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
    accessorKey: 'path',
    header: 'Đường dẫn API',
    cell: ({ row }) => <div className=" text-blue-600">{row.getValue('path')}</div>,
  },
  {
    enableSorting: false,
    accessorKey: 'message',
    header: 'Nội dung lỗi',
    meta: { className: 'w-64 min-w-64' },
    cell: ({ row }) => {
      const msg = row.getValue('message') as string || '';
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="truncate w-64 min-w-64 cursor-help">
                {msg}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-md">
              <p className="text-xs leading-relaxed">{msg}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    enableSorting: false,
    accessorKey: 'stackTrace',
    header: 'Chi tiết (StackTrace)',
    meta: { className: 'w-48 min-w-48' },
    cell: ({ row }) => {
      const stack = row.getValue('stackTrace') as string || '';
      if (!stack) return <div className="">Không có</div>;
      
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="truncate w-48 min-w-48 cursor-help text-muted-foreground">
                {stack}
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-2xl max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap leading-relaxed bg-neutral-900 text-neutral-100 p-2 rounded">
                {stack}
              </pre>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    enableSorting: false,
    accessorKey: 'ipAddress',
    header: 'Địa chỉ IP',
    cell: ({ row }) => <div className="">{row.getValue('ipAddress')}</div>,
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
          {checkPermission('ErrorLog_Delete') && (
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
