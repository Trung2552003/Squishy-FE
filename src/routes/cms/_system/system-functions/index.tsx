import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { systemFunctionApi, type SystemFunction, type SystemFunctionPayload } from '@/lib/api/system/systemFunction'
import { getColumns } from './components/columns'
import { DataTable } from '@/components/ui/data-table'
import { SystemFunctionForm } from './components/system-function-form'
import { TableRefreshButton } from '@/components/ui/table-refresh-button'
import { useEntityRefresh } from '@/hooks/useEntityRefresh'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { usePermission } from '@/hooks/usePermission'

export const Route = createFileRoute('/cms/_system/system-functions/')({
  component: SystemFunctionsPage,
})

function SystemFunctionsPage() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')

  const { hasNewData, resetNewData } = useEntityRefresh('SystemFunction')

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

  const canAdd = checkPermission('SystemFunction_Add')
  const canBulkDelete = checkPermission('SystemFunction_BulkDelete')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['systemFunctions', pagination, debouncedKeyword],
    queryFn: () => systemFunctionApi.getPaged({
      pageIndex: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      keyword: debouncedKeyword,
    }),
    placeholderData: keepPreviousData,
  })

  const { data: allData } = useQuery({
    queryKey: ['systemFunctionsAll', { includeHidden: true }],
    queryFn: () => systemFunctionApi.getAll({ includeHidden: true }),
  })

  const allFunctions = allData?.data || []

  const tableData = data?.data?.items || []
  const pageCount = data?.data?.totalPages || 1
  const totalCount = data?.data?.totalCount || 0

  // Quản lý Modal & Dữ liệu đang sửa
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingData, setEditingData] = useState<SystemFunction | null>(null)

  // Handlers mở form
  const handleAddNew = () => {
    setEditingData(null)
    setIsModalOpen(true)
  }

  const handleEdit = (data: SystemFunction) => {
    setEditingData(data)
    setIsModalOpen(true)
  }

  // Quản lý Dialog Xóa
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Quản lý trạng thái mở rộng cây (Tree Expand)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isVisible = (item: SystemFunction) => {
    if (!item.parentId || item.parentId === "00000000-0000-0000-0000-000000000000") return true;
    let currentParentId = item.parentId;
    while (currentParentId && currentParentId !== "00000000-0000-0000-0000-000000000000") {
      if (!expandedIds.has(currentParentId)) return false;
      const parent = allFunctions.find((f: { id: string }) => f.id === currentParentId);
      if (!parent) return false;
      currentParentId = parent.parentId;
    }
    return true;
  }

  const visibleTableData = tableData.filter(isVisible)

  // --- MUTATIONS ---
  const createMutation = useMutation({
    mutationFn: systemFunctionApi.create,
    onSuccess: (res: any) => {
      toast.success(res.message || 'Thêm mới thành công!')
      setIsModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['systemFunctions'] })
      queryClient.invalidateQueries({ queryKey: ['systemFunctionsAll'] })
      queryClient.invalidateQueries({ queryKey: ['systemFunctionsMy'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Thêm mới thất bại.')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SystemFunctionPayload }) => systemFunctionApi.update(id, data),
    onSuccess: (res: any) => {
      toast.success(res.message || 'Cập nhật thành công!')
      setIsModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['systemFunctions'] })
      queryClient.invalidateQueries({ queryKey: ['systemFunctionsAll'] })
      queryClient.invalidateQueries({ queryKey: ['systemFunctionsMy'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Cập nhật thất bại.')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: systemFunctionApi.delete,
    onSuccess: (res: any) => {
      toast.success(res.message || 'Xóa thành công!')
      setConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['systemFunctions'] })
      queryClient.invalidateQueries({ queryKey: ['systemFunctionsAll'] })
      queryClient.invalidateQueries({ queryKey: ['systemFunctionsMy'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Xóa thất bại.')
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: systemFunctionApi.deleteMany,
    onSuccess: (res: any) => {
      toast.success(res.message || 'Đã xóa các mục đã chọn!')
      queryClient.invalidateQueries({ queryKey: ['systemFunctions'] })
      queryClient.invalidateQueries({ queryKey: ['systemFunctionsAll'] })
      queryClient.invalidateQueries({ queryKey: ['systemFunctionsMy'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Xóa thất bại.')
    }
  })

  const handleDelete = (id: string) => {
    setDeleteId(id)
    setConfirmOpen(true)
  }

  const handleSubmitForm = (values: SystemFunctionPayload) => {
    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: values })
    } else {
      createMutation.mutate(values)
    }
  }

  const columns = getColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    allFunctions,
    expandedIds,
    toggleExpand,
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
            data={visibleTableData} 
            onDeleteBulk={canBulkDelete ? (ids) => bulkDeleteMutation.mutate(ids) : undefined}
            isDeletingBulk={bulkDeleteMutation.isPending}
            pageCount={pageCount}
            totalCount={totalCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            keyword={keyword}
            onKeywordChange={setKeyword}
            headerActions={
              <div className="flex items-center gap-2">
                <TableRefreshButton 
                  hasNewData={hasNewData} 
                  onRefresh={() => {
                    refetch()
                    queryClient.invalidateQueries({ queryKey: ['systemFunctionsAll'] })
                    queryClient.invalidateQueries({ queryKey: ['systemFunctionsMy'] })
                    resetNewData()
                  }} 
                />
                {canAdd && (
                  <Button onClick={handleAddNew} className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Thêm mới
                  </Button>
                )}
              </div>
            }
          />
        )}
      </div>

      <SystemFunctionForm
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialData={editingData}
        onSubmit={handleSubmitForm}
        isLoading={createMutation.isPending || updateMutation.isPending}
        allFunctions={allFunctions}
      />

      <ConfirmDialog 
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xác nhận xóa chức năng"
        description="Bạn có chắc chắn muốn xóa chức năng này? Hành động này không thể hoàn tác."
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
      />
    </div>
  )
}
