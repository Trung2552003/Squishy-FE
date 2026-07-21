import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { errorLogApi } from '@/lib/api/system/errorLog'
import { getColumns } from './components/columns'
import { DataTable } from '@/components/ui/data-table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { usePermission } from '@/hooks/usePermission'
import type { DateRange } from 'react-day-picker'
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range'
import { format } from 'date-fns'

export const Route = createFileRoute('/cms/_system/error-logs/')({
  component: ErrorLogsPage,
})

function ErrorLogsPage() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [date, setDate] = useState<DateRange | undefined>()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword)
      if (keyword !== debouncedKeyword) {
        setPagination(prev => ({ ...prev, pageIndex: 0 }))
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [keyword, debouncedKeyword])

  const queryClient = useQueryClient()
  const { checkPermission } = usePermission()

  const canBulkDelete = checkPermission('ErrorLog_BulkDelete');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['errorLogs', pagination, debouncedKeyword, date?.from, date?.to],
    queryFn: () => errorLogApi.getPaged({
      pageIndex: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      keyword: debouncedKeyword,
      startDate: date?.from ? format(date.from, 'yyyy-MM-dd') : undefined,
      endDate: date?.to ? format(date.to, 'yyyy-MM-dd') : undefined,
    }),
    placeholderData: keepPreviousData,
  })

  const tableData = data?.data?.items || []
  const pageCount = data?.data?.totalPages || 1
  const totalCount = data?.data?.totalCount || 0

  // Quản lý Dialog Xóa
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    setDeleteId(id)
    setConfirmOpen(true)
  }

  // --- MUTATIONS ---
  const deleteMutation = useMutation({
    mutationFn: errorLogApi.delete,
    onSuccess: (res: any) => {
      toast.success(res.message || 'Xóa thành công!')
      setConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['errorLogs'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Xóa thất bại.')
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: errorLogApi.deleteMany,
    onSuccess: (res: any) => {
      toast.success(res.message || 'Đã xóa các mục đã chọn!')
      queryClient.invalidateQueries({ queryKey: ['errorLogs'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Xóa thất bại.')
    }
  })

  const columns = getColumns({
    onDelete: handleDelete,
    checkPermission,
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-card rounded-lg shadow-sm border border-border p-4 sm:p-6">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground/70 space-y-4">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Đang tải dữ liệu...</p>
          </div>
        ) : isError ? (
          <div className="h-64 flex flex-col items-center justify-center text-red-500 space-y-3 bg-red-50 dark:bg-red-500/10 rounded-lg">
            <p className="font-medium text-red-600">Đã có lỗi xảy ra khi tải dữ liệu từ máy chủ.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="border-red-200 dark:border-red-500/30 text-red-600 hover:bg-red-50 dark:bg-red-500/10">Thử lại</Button>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={tableData} 
            onDeleteBulk={canBulkDelete ? (ids) => bulkDeleteMutation.mutate(ids) : undefined}
            isDeletingBulk={bulkDeleteMutation.isPending}
            pageCount={pageCount}
            totalCount={totalCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            keyword={keyword}
            onKeywordChange={setKeyword}
            searchActions={
              <DatePickerWithRange date={date} setDate={setDate} />
            }
          />
        )}
      </div>

      <ConfirmDialog 
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xác nhận xóa nhật ký lỗi"
        description="Bạn có chắc chắn muốn xóa bản ghi lỗi này? Hành động này không thể hoàn tác."
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
      />
    </div>
  )
}
