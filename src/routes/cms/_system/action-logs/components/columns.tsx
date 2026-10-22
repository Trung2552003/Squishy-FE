import type { ColumnDef } from '@tanstack/react-table'
import type { ActionLogDto } from '@/lib/api/system/actionLog'
import { Button } from '@/components/ui/button'
import { TrashIcon } from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ColumnProps {
  onDelete: (id: string) => void
  checkPermission: (code: string) => boolean
}

export const getColumns = ({ onDelete, checkPermission }: ColumnProps): ColumnDef<ActionLogDto>[] => [
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
    cell: ({ row }) => <div className="font-semibold text-xs">{row.getValue('userName')}</div>,
  },
  {
    accessorKey: 'action',
    header: 'Hành động',
    cell: ({ row }) => {
      const action = row.getValue('action') as string;
      return <div className="font-semibold text-xs text-indigo-600">{action}</div>
    },
  },
  {
    accessorKey: 'module',
    header: 'Phân hệ',
    cell: ({ row }) => <div className="text-[14px]">{row.getValue('module')}</div>,
  },
  {
    enableSorting: false,
    accessorKey: 'description',
    header: 'Mô tả',
    meta: { className: 'w-64 min-w-64' },
    cell: ({ row }) => {
      const desc = row.getValue('description') as string || '';
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-[14px] truncate w-64 min-w-64 cursor-help text-muted-foreground">
                {desc}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-md">
              <p className="text-xs leading-relaxed">{desc}</p>
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
    cell: ({ row }) => <div className="text-[14px] text-muted-foreground">{row.getValue('ipAddress')}</div>,
  },
  {
    accessorKey: 'createdAt',
    header: 'Thời gian',
    cell: ({ row }) => {
      const dateStr = row.getValue('createdAt') as string;
      if (!dateStr) return null;
      return <div className="text-[14px]">{new Date(dateStr).toLocaleString('vi-VN')}</div>;
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
          {checkPermission('ActionLog_Delete') && (
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
