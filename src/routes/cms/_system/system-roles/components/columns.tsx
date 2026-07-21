import type { ColumnDef } from '@tanstack/react-table'
import type { SystemRole } from '@/lib/api/system/systemRole'
import { Button } from '@/components/ui/button'
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'

interface ColumnProps {
  onEdit: (data: SystemRole) => void
  onDelete: (id: string) => void
  checkPermission: (code: string) => boolean
}

export const getColumns = ({ onEdit, onDelete, checkPermission }: ColumnProps): ColumnDef<SystemRole>[] => [
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
    accessorKey: 'name',
    header: 'Tên vai trò',
    cell: ({ row }) => <div className="">{row.getValue('name')}</div>,
  },
  {
    accessorKey: 'code',
    header: 'Mã',
    cell: ({ row }) => <div className="">{row.getValue('code')}</div>,
  },
  {
    accessorKey: 'description',
    header: 'Mô tả',
    cell: ({ row }) => <div className="">{row.getValue('description') || ''}</div>,
  },
  {
    id: 'actions',
    enableSorting: false,
    header: () => <div className="flex justify-center w-full">Thao tác</div>,
    cell: ({ row }) => {
      const role = row.original

      return (
        <div className="flex items-center justify-center gap-2">
          {checkPermission('SystemRole_Edit') && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => onEdit(role)}
              title="Chỉnh sửa"
            >
              <PencilSimpleIcon className="h-4 w-4" />
            </Button>
          )}
          {checkPermission('SystemRole_Delete') && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-red-600 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:bg-red-500/10"
              onClick={() => onDelete(role.id)}
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
