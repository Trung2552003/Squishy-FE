import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { userApi, type UserDto, type UserPayload } from '@/lib/api/system/user'
import { systemRoleApi } from '@/lib/api/system/systemRole'
import { getColumns } from './components/columns'
import { DataTable } from '@/components/ui/data-table'
import { SystemUserForm } from './components/system-user-form'
import { TableRefreshButton } from '@/components/ui/table-refresh-button'
import { useEntityRefresh } from '@/hooks/useEntityRefresh'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { usePermission } from '@/hooks/usePermission'

export const Route = createFileRoute('/cms/_system/system-users/')({
  component: SystemUsersPage,
})

function SystemUsersPage() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')

  const { hasNewData, resetNewData } = useEntityRefresh('SystemUser')

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

  // Kiểm tra quyền
  const canAdd = checkPermission('SystemUser_Add')
  const canBulkDelete = checkPermission('SystemUser_BulkDelete')

  // Fetch Users
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['systemUsers', pagination, debouncedKeyword],
    queryFn: () => userApi.getPaged({
      pageIndex: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      keyword: debouncedKeyword,
    }),
    placeholderData: keepPreviousData,
  })

  // Fetch Roles for Checkboxes in Form
  const { data: allRolesData } = useQuery({
    queryKey: ['systemRolesAll'],
    queryFn: systemRoleApi.getAll,
  })

  const allRoles = allRolesData?.data || []
  const tableData = data?.data?.items || []
  const pageCount = data?.data?.totalPages || 1
  const totalCount = data?.data?.totalCount || 0

  // State quản lý Modal form
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingData, setEditingData] = useState<UserDto | null>(null)
  const [apiError, setApiError] = useState<{ field: string; message: string } | null>(null)

  // Handlers mở form
  const handleAddNew = () => {
    setEditingData(null)
    setApiError(null)
    setIsModalOpen(true)
  }

  const handleEdit = (data: UserDto) => {
    setEditingData(data)
    setApiError(null)
    setIsModalOpen(true)
  }

  // Quản lý Dialog Xóa
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    setDeleteId(id)
    setConfirmOpen(true)
  }

  // --- MUTATIONS ---
  const createMutation = useMutation({
    mutationFn: async (data: UserPayload) => {
      const res: any = await userApi.create(data);
      if (res.isSuccess && data.roleIds) {
        await userApi.updateUserRoles(res.data.id, data.roleIds);
      }
      return res;
    },
    onSuccess: (res: any) => {
      toast.success(res.message || 'Thêm mới thành công!')
      setIsModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['systemUsers'] })
      queryClient.invalidateQueries({ queryKey: ['userRoles'] })
      queryClient.invalidateQueries({ queryKey: ['systemFunctionsMy'] })
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Thêm mới thất bại.';
      if (msg.toLowerCase().includes('mật khẩu') || msg.toLowerCase().includes('password') || msg.toLowerCase().includes('kí tự')) {
        setApiError({ field: 'password', message: msg });
      } else {
        toast.error(msg);
      }
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UserPayload }) => {
      const res: any = await userApi.update(id, data);
      if (data.roleIds) {
        await userApi.updateUserRoles(id, data.roleIds);
      }
      return res;
    },
    onSuccess: (res: any, variables) => {
      toast.success(res.message || 'Cập nhật thành công!')
      setIsModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['systemUsers'] })
      queryClient.invalidateQueries({ queryKey: ['userRoles', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['systemFunctionsMy'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Cập nhật thất bại.')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: userApi.delete,
    onSuccess: (res: any) => {
      toast.success(res.message || 'Xóa thành công!')
      setConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['systemUsers'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Xóa thất bại.')
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: userApi.deleteMany,
    onSuccess: (res: any) => {
      toast.success(res.message || 'Đã xóa các mục đã chọn!')
      queryClient.invalidateQueries({ queryKey: ['systemUsers'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Xóa thất bại.')
    }
  })

  const handleSubmitForm = (values: UserPayload) => {
    setApiError(null)
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
                    queryClient.invalidateQueries({ queryKey: ['userRoles'] })
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

      <SystemUserForm
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialData={editingData}
        onSubmit={handleSubmitForm}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        allRoles={allRoles}
        apiError={apiError}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xác nhận xóa người dùng"
        description="Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác."
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
      />
    </div>
  )
}
