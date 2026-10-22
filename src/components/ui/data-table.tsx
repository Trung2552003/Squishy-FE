import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
} from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { TrashIcon, MagnifyingGlassIcon, CircleNotchIcon, CaretLeftIcon, CaretRightIcon, CaretUpIcon, CaretDownIcon, ArrowsDownUpIcon } from '@phosphor-icons/react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onDeleteBulk?: (ids: string[]) => void
  isDeletingBulk?: boolean
  pageCount?: number
  totalCount?: number
  pagination?: {
    pageIndex: number
    pageSize: number
  }
  onPaginationChange?: (updater: any) => void
  keyword?: string
  onKeywordChange?: (keyword: string) => void
  searchActions?: React.ReactNode
  headerActions?: React.ReactNode
  filterElements?: React.ReactNode
}

// Cột "Thao tác" dính bên phải khi bảng cuộn ngang trên màn hình nhỏ, để nút Sửa/Xóa luôn bấm được
const STICKY_ACTIONS = 'sticky right-0 z-[1] shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.25)] md:shadow-none'

export function DataTable<TData, TValue>({
  columns,
  data,
  onDeleteBulk,
  isDeletingBulk,
  pageCount,
  totalCount,
  pagination,
  onPaginationChange,
  keyword,
  onKeywordChange,
  searchActions,
  headerActions,
  filterElements
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount ?? -1,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: onPaginationChange,
    manualPagination: !!pagination,
    state: {
      rowSelection,
      globalFilter: keyword ?? globalFilter,
      sorting,
      ...(pagination ? { pagination } : {}),
    },
    initialState: !pagination ? {
      pagination: {
        pageSize: 10,
      },
    } : undefined,
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedIds = selectedRows.map(row => (row.original as any).id).filter(Boolean)

  const handleBulkDelete = () => {
    if (onDeleteBulk && selectedIds.length > 0) {
      onDeleteBulk(selectedIds)
      setRowSelection({})
      setConfirmBulkOpen(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2.5 mb-1.5 flex-wrap">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto flex-wrap">
          <div className="relative w-full sm:w-72">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 w-3.5 h-3.5" />
            <Input
              placeholder="Tìm kiếm..."
              value={keyword !== undefined ? keyword : (globalFilter ?? '')}
              onChange={(event) => {
                if (onKeywordChange) {
                  onKeywordChange(event.target.value)
                } else {
                  setGlobalFilter(event.target.value)
                }
              }}
              className="pl-8 h-9 text-base sm:text-sm w-full rounded-lg"
            />
          </div>
          {searchActions}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {!!onDeleteBulk && selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-600 px-2.5 h-9 rounded-lg border border-red-200 dark:border-red-500/30 text-sm">
              <span className="font-semibold">Đã chọn {selectedIds.length}</span>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setConfirmBulkOpen(true)}
                disabled={isDeletingBulk}
                className="h-7 text-sm px-2 rounded-md shadow-sm"
              >
                {isDeletingBulk ? <CircleNotchIcon className="w-3.5 h-3.5 mr-1 animate-spin" /> : <TrashIcon className="w-3.5 h-3.5 mr-1" />}
                Xóa
              </Button>
            </div>
          )}
          {headerActions}
        </div>
      </div>

      {filterElements && (
        <div className="mb-3 flex flex-col sm:flex-row items-center gap-2 flex-wrap">
          {filterElements}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-border">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id} 
                      className={`text-muted-foreground font-bold text-xs uppercase tracking-wide h-10 px-2.5 border-r border-border last:border-r-0 ${
                        header.column.id === 'actions' ? STICKY_ACTIONS + ' bg-muted' : ''
                      } ${(header.column.columnDef.meta as any)?.className || ''}`}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span className="text-muted-foreground/70">
                              {{
                                asc: <CaretUpIcon weight="bold" className="w-3 h-3" />,
                                desc: <CaretDownIcon weight="bold" className="w-3 h-3" />,
                              }[header.column.getIsSorted() as string] ?? (
                                <ArrowsDownUpIcon weight="bold" className="w-3 h-3" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-muted/30 border-border/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={`py-2.5 px-3 text-sm border-r border-border last:border-r-0 ${cell.column.id === 'actions' ? STICKY_ACTIONS + ' bg-card' : ''} ${(cell.column.columnDef.meta as any)?.className || ''}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-sm text-muted-foreground">
                  Không có dữ liệu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog 
        open={confirmBulkOpen}
        onOpenChange={setConfirmBulkOpen}
        title="Xác nhận xóa nhiều mục"
        description={`Bạn có chắc chắn muốn xóa ${selectedIds.length} mục đã chọn? Hành động này không thể hoàn tác.`}
        isLoading={isDeletingBulk}
        onConfirm={handleBulkDelete}
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pt-1 pb-2 text-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>Hiển thị</span>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-18 text-sm rounded-md shadow-sm border-border focus:ring-indigo-500">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent className="rounded-lg min-w-16">
                {[5, 10, 25, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`} className="text-sm">
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="hidden sm:block text-muted-foreground/70">|</div>
          <div>
            {totalCount === 0 ? 0 : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} - {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, totalCount ?? data.length)} trên tổng {totalCount ?? data.length}
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground disabled:opacity-50 disabled:hover:text-muted-foreground/70 transition-colors"
          >
            <CaretLeftIcon className="w-3.5 h-3.5" weight="bold" />
          </button>
          
          <div className="flex items-center gap-1">
            {(() => {
              const pageCount = table.getPageCount();
              const currentPage = table.getState().pagination.pageIndex;
              const pages = [];
              if (pageCount <= 5) {
                for (let i = 0; i < pageCount; i++) pages.push(i);
              } else {
                if (currentPage <= 2) {
                  pages.push(0, 1, 2, 3, 4);
                } else if (currentPage >= pageCount - 3) {
                  pages.push(pageCount - 5, pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1);
                } else {
                  pages.push(currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2);
                }
              }

              return pages.map((p) => (
                <button
                  key={p}
                  onClick={() => table.setPageIndex(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold transition-colors ${
                    currentPage === p
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {p + 1}
                </button>
              ));
            })()}
          </div>

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground disabled:opacity-50 disabled:hover:text-muted-foreground/70 transition-colors"
          >
            <CaretRightIcon className="w-3.5 h-3.5" weight="bold" />
          </button>
        </div>
      </div>
    </div>
  )
}
