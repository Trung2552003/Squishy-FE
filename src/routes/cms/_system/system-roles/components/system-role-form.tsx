import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react"
import { CircleNotchIcon, FloppyDiskIcon, XIcon, PencilSimpleIcon } from "@phosphor-icons/react"
import { systemRoleSchema, type SystemRolePayload, type SystemRole, systemRoleApi } from "@/lib/api/system/systemRole"
import type { SystemFunction } from "@/lib/api/system/systemFunction"
import { Textarea } from "@/components/ui/textarea"

const getAllDescendantIds = (items: SystemFunction[], parentId: string): string[] => {
  let descendantIds: string[] = []
  const children = items.filter(i => i.parentId === parentId)
  for (const child of children) {
    descendantIds.push(child.id)
    descendantIds = descendantIds.concat(getAllDescendantIds(items, child.id))
  }
  return descendantIds
}

const getAncestorIds = (items: SystemFunction[], childId: string): string[] => {
  const ancestorIds: string[] = []
  let current = items.find(i => i.id === childId)
  while (current && current.parentId && current.parentId !== "00000000-0000-0000-0000-000000000000") {
    ancestorIds.push(current.parentId)
    current = items.find(i => i.id === current?.parentId)
  }
  return ancestorIds
}

interface SystemRoleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: SystemRole | null
  onSubmit: (data: SystemRolePayload) => void
  isLoading?: boolean
  allFunctions: SystemFunction[]
}

export function SystemRoleForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isLoading,
  allFunctions,
}: SystemRoleFormProps) {
  const isEditing = !!initialData
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [isFetchingFunctions, setIsFetchingFunctions] = useState(false)

  const form = useForm<SystemRolePayload>({
    resolver: zodResolver(systemRoleSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      functionIds: [],
    },
  })

  useEffect(() => {
    if (open) {
      if (initialData) {
        setIsFetchingFunctions(true)
        systemRoleApi.getRoleFunctions(initialData.id)
          .then((res: any) => {
            const funcData = res.data || []
            const funcIds = funcData.filter((x: any) => x.isGranted).map((x: any) => x.id)
            form.reset({
              code: initialData.code || "",
              name: initialData.name || "",
              description: initialData.description || "",
              functionIds: funcIds,
            })
          })
          .catch(() => {
            form.reset({
              code: initialData.code || "",
              name: initialData.name || "",
              description: initialData.description || "",
              functionIds: [],
            })
          })
          .finally(() => setIsFetchingFunctions(false))
      } else {
        form.reset({
          code: "",
          name: "",
          description: "",
          functionIds: [],
        })
      }
    }
  }, [open, initialData, form])

  const handleFormSubmit = (values: SystemRolePayload) => {
    onSubmit(values)
  }

  const toggleExpand = (id: string, e: any) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderTree = (items: SystemFunction[], parentId: string, depth = 0) => {
    const children = items
      .filter(i => (parentId === "" ? (!i.parentId || i.parentId === "00000000-0000-0000-0000-000000000000") : i.parentId === parentId))
      .sort((a, b) => a.order - b.order)
      
    if (children.length === 0) return null

    return (
      <div className="flex flex-col">
        {children.map(child => {
          const hasChildren = items.some(i => i.parentId === child.id)
          const isExpanded = expandedIds.has(child.id)
          
          return (
            <div key={child.id} className="flex flex-col">
              <div className="flex items-center py-1.5 hover:bg-muted/50 rounded-lg px-2" style={{ paddingLeft: `${depth * 24}px` }}>
                {hasChildren ? (
                  <div 
                    className="cursor-pointer mr-1.5 flex items-center justify-center p-0.5 hover:bg-neutral-200 rounded-lg text-muted-foreground"
                    onClick={(e) => toggleExpand(child.id, e)}
                  >
                    {isExpanded ? <CaretDownIcon className="w-4 h-4 shrink-0" /> : <CaretRightIcon className="w-4 h-4 shrink-0" />}
                  </div>
                ) : (
                  <span className="w-5.5 shrink-0" />
                )}
                
                <FormField
                  control={form.control}
                  name="functionIds"
                  render={({ field }) => {
                    return (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0 m-0">
                        <FormControl>
                          <Checkbox
                            className=""
                            checked={field.value?.includes(child.id)}
                            onCheckedChange={(checked) => {
                              const current = field.value || []
                              let updated = [...current]
                              
                              if (checked) {
                                // Add current node
                                if (!updated.includes(child.id)) updated.push(child.id)
                                
                                // Add all ancestors so the menu hierarchy works
                                const ancestors = getAncestorIds(items, child.id)
                                ancestors.forEach(id => {
                                  if (!updated.includes(id)) updated.push(id)
                                })
                                
                                // Add all descendants (quick select all)
                                const descendants = getAllDescendantIds(items, child.id)
                                descendants.forEach(id => {
                                  if (!updated.includes(id)) updated.push(id)
                                })
                              } else {
                                // Remove current node
                                updated = updated.filter(val => val !== child.id)
                                
                                // Remove all descendants
                                const descendants = getAllDescendantIds(items, child.id)
                                updated = updated.filter(val => !descendants.includes(val))
                              }
                              
                              field.onChange(updated)
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer flex-1 text-[15px]">
                          {child.name.replace(/^\|\s*([—-]\s*)*/, '')}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              </div>
              {hasChildren && isExpanded && renderTree(items, child.id, depth + 1)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150 max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 shrink-0">
          <DialogTitle>
            {isEditing ? "Cập nhật vai trò" : "Thêm mới vai trò"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Chỉnh sửa thông tin vai trò hiện tại." 
              : "Điền thông tin dưới đây để tạo vai trò mới trong hệ thống."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
            <form id="role-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã vai trò <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập mã vai trò" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên vai trò <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên vai trò" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={3}
                        placeholder="Nhập mô tả cho vai trò này" 
                        {...field} 
                        className="resize-y"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-3">
                <FormLabel>Phân quyền chức năng</FormLabel>
                <div className="border border-border rounded-lg p-2 bg-card shadow-inner min-h-50">
                  {isFetchingFunctions ? (
                    <div className="flex items-center justify-center p-8 text-muted-foreground/70">
                      <CircleNotchIcon className="w-6 h-6 animate-spin mr-2" />
                      <span className="text-sm">Đang tải phân quyền...</span>
                    </div>
                  ) : (
                    renderTree(allFunctions, "")
                  )}
                </div>
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="p-4 px-6 border-t border-border/50 shrink-0 bg-muted/10">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 min-w-30 rounded-lg">
            <XIcon className="w-4 h-4 mr-2" />
            Hủy bỏ
          </Button>
          <Button type="submit" form="role-form" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-10 min-w-30 rounded-lg">
            {isLoading ? (
              <CircleNotchIcon className="w-4 h-4 mr-2 animate-spin" />
            ) : isEditing ? (
              <PencilSimpleIcon className="w-4 h-4 mr-2" />
            ) : (
              <FloppyDiskIcon className="w-4 h-4 mr-2" />
            )}
            {isLoading ? "Đang lưu..." : isEditing ? "Cập nhật" : "Lưu lại"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
