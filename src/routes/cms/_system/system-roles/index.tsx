import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { systemRoleApi, type SystemRole, type SystemRolePayload } from '@/lib/api/system/systemRole'
import { getColumns } from './components/columns'
import { DataTable } from '@/components/ui/data-table'
import { SystemRoleForm } from './components/system-role-form'
import { TableRefreshButton } from '@/components/ui/table-refresh-button'
import { useEntityRefresh } from '@/hooks/useEntityRefresh'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { usePermission } from '@/hooks/usePermission'
import { systemFunctionApi } from '@/lib/api/system/systemFunction'

export const Route = createFileRoute('/cms/_system/system-roles/')({
  component: SystemRolesPage,
})

function SystemRolesPage() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')

  const { hasNewData, resetNewData } = useEntityRefresh('SystemRole')

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

  const canAdd = checkPermission('SystemRole_Add')
  const canBulkDelete = checkPermission('SystemRole_BulkDelete')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['systemRoles', pagination, debouncedKeyword],
    queryFn: () => systemRoleApi.getPaged({
      pageIndex: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      keyword: debouncedKeyword,
    }),
    placeholderData: keepPreviousData,
  })

  const { data: allFunctionsData } = useQuery({
    queryKey: ['systemFunctionsAll'],
    queryFn: () => systemFunctionApi.getAll(),
  })

  const allFunctions = allFunctionsData?.data || []

  const tableData = data?.data?.items || []
  const pageCount = data?.data?.totalPages || 1
  const totalCount = data?.data?.totalCount || 0

  // Quản lý Modal & Dữ liệu đang sửa
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingData, setEditingData] = useState<SystemRole | null>(null)

  // Handlers mở form
  const handleAddNew = () => {
    setEditingData(null)
    setIsModalOpen(true)
  }

  const handleEdit = (data: SystemRole) => {
    setEditingData(data)
    setIsModalOpen(true)
  }

  // Quản lý Dialog Xóa
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // --- MUTATIONS ---
  const createMutation = useMutation({
    mutationFn: async (data: SystemRolePayload) => {
      const res: any = await systemRoleApi.create(data);
      if (res.isSuccess && data.functionIds) {
        await systemRoleApi.updateRoleFunctions(res.data.id, data.functionIds);
      }
      return res;
    },
    onSuccess: (res: any) => {
      toast.success(res.message || 'Thêm mới thành công!')
      setIsModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['systemRoles'] })
      queryClient.invalidateQueries({ queryKey: ['systemRolesAll'] })
      queryClient.invalidateQueries({ queryKey: ['systemFunctionsMy'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Thêm mới thất bại.')
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SystemRolePayload }) => {
      const res: any = await systemRoleApi.update(id, data);
      if (data.functionIds) {
        await systemRoleApi.updateRoleFunctions(id, data.functionIds);
      }
      return res;
    },
    onSuccess: (res: any) => {
      toast.success(res.message || 'Cập nhật thành công!')
      setIsModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['systemRoles'] })
      queryClient.invalidateQueries({ queryKey: ['systemRolesAll'] })
      queryClient.invalidateQueries({ queryKey: ['systemFunctionsMy'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Cập nhật thất bại.')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: systemRoleApi.delete,
    onSuccess: (res: any) => {
      toast.success(res.message || 'Xóa thành công!')
      setConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['systemRoles'] })
      queryClient.invalidateQueries({ queryKey: ['systemRolesAll'] })
      queryClient.invalidateQueries({ queryKey: ['systemFunctionsMy'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Xóa thất bại.')
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: systemRoleApi.deleteMany,
    onSuccess: (res: any) => {
      toast.success(res.message || 'Đã xóa các mục đã chọn!')
      queryClient.invalidateQueries({ queryKey: ['systemRoles'] })
      queryClient.invalidateQueries({ queryKey: ['systemRolesAll'] })
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

  const handleSubmitForm = (values: SystemRolePayload) => {
    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: values })
    } else {
      createMutation.mutate(values)
    }
  }

  const columns = getColumns({
    onEdit: handleEdit,
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
            headerActions={
              <div className="flex items-center gap-2">
                <TableRefreshButton 
                  hasNewData={hasNewData} 
                  onRefresh={() => {
                    refetch()
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

      <SystemRoleForm
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
        title="Xác nhận xóa vai trò"
        description="Bạn có chắc chắn muốn xóa vai trò này? Hành động này không thể hoàn tác."
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
      />
    </div>
  )
}
