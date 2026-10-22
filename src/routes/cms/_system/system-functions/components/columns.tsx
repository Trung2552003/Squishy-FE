import type { ColumnDef } from '@tanstack/react-table'
import type { SystemFunction } from '@/lib/api/system/systemFunction'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'

interface ColumnProps {
  onEdit: (data: SystemFunction) => void
  onDelete: (id: string) => void
  allFunctions: SystemFunction[]
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
  checkPermission: (code: string) => boolean
}

export const getColumns = ({ onEdit, onDelete, allFunctions, expandedIds, toggleExpand, checkPermission }: ColumnProps): ColumnDef<SystemFunction>[] => [
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
    enableSorting: false,
    header: 'Tên chức năng',
    cell: ({ row }) => {
      const rawName = row.getValue('name') as string;
      const cleanName = rawName.replace(/^\|\s*(—\s*)*/, '');
      const depth = (rawName.match(/—/g) || []).length;

      const hasChildren = allFunctions.some(f => f.parentId === row.original.id);
      const isExpanded = expandedIds.has(row.original.id);
      const iconName = row.original.icon;
      const IconComponent = iconName ? (PhosphorIcons as any)[iconName] : null;

      return (
        <div
          className="flex items-center text-foreground"
          style={{ paddingLeft: `${depth * 24}px` }}
        >
          {hasChildren ? (
            <div
              className="cursor-pointer mr-1.5 flex items-center justify-center p-0.5 hover:bg-neutral-200 rounded"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(row.original.id);
              }}
            >
              {isExpanded ? <PhosphorIcons.CaretDownIcon className="w-4 h-4 shrink-0" /> : <PhosphorIcons.CaretRightIcon className="w-4 h-4 shrink-0" />}
            </div>
          ) : (
            <span className="w-5.5 shrink-0" />
          )}
          {IconComponent && <IconComponent className="w-4 h-4 mr-2 shrink-0" />}
          <span className="">{cleanName}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'code',
    enableSorting: false,
    header: 'Mã chức năng',
    cell: ({ row }) => <div className="">{row.getValue('code')}</div>,
  },
  {
    accessorKey: 'url',
    enableSorting: false,
    header: 'Đường dẫn (URL)',
    cell: ({ row }) => <div className="">{row.getValue('url') || ''}</div>,
  },
  {
    accessorKey: 'type',
    enableSorting: false,
    header: () => <div className="flex-1 text-center">Loại</div>,
    meta: { className: 'text-center' },
    cell: ({ row }) => {
      const typeStr = row.getValue('type') as string;

      if (typeStr === 'folder') {
        return <div title="Thư mục (Folder)" className="flex justify-center"><PhosphorIcons.FolderIcon className="w-5 h-5 text-amber-500" /></div>;
      }
      if (typeStr === 'function') {
        return <div title="Chức năng (Function)" className="flex justify-center"><PhosphorIcons.GearIcon className="w-5 h-5 text-blue-500" /></div>;
      }
      if (typeStr === 'button') {
        return <div title="Nút bấm (Button)" className="flex justify-center"><PhosphorIcons.HandPointingIcon className="w-5 h-5 text-emerald-500" /></div>;
      }

      return <div className="flex justify-center text-muted-foreground/70 text-sm">-</div>;
    },
  },
  {
    accessorKey: 'order',
    enableSorting: false,
    header: () => <div className="flex-1 text-center">Thứ tự</div>,
    meta: { className: 'text-center' },
    cell: ({ row }) => <div>{row.getValue('order') as string}</div>,
  },
  {
    accessorKey: 'isShow',
    enableSorting: false,
    header: () => <div className="flex-1 text-center">Trạng thái</div>,
    meta: { className: 'text-center' },
    cell: ({ row }) => {
      const isShow = row.getValue('isShow') as boolean
      return (
        <div className="flex justify-center">
          {isShow ? (
            <Badge className="px-2 py-0.5 text-[10.5px] bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 font-semibold hover:bg-emerald-500/20">
              Hiển thị
            </Badge>
          ) : (
            <Badge variant="outline" className="px-2 py-0.5 text-[10.5px] text-muted-foreground border-muted-foreground/30 font-semibold">
              Ẩn
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    id: 'actions',
    enableSorting: false,
    header: () => <div className="flex justify-center w-full">Thao tác</div>,
    cell: ({ row }) => {
      const func = row.original

      return (
        <div className="flex items-center justify-center gap-2">
          {checkPermission('SystemFunction_Edit') && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => onEdit(func)}
              title="Chỉnh sửa"
            >
              <PencilSimpleIcon className="h-4 w-4" />
            </Button>
          )}
          {checkPermission('SystemFunction_Delete') && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-red-600 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:bg-red-500/10"
              onClick={() => onDelete(func.id)}
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
