import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { systemFunctionSchema, type SystemFunctionPayload, type SystemFunction } from '@/lib/api/system/systemFunction'
import { CircleNotchIcon, CaretDownIcon, CaretRightIcon, XIcon, CircleIcon, RadioButtonIcon, FolderIcon, GearIcon, HandPointingIcon, FloppyDiskIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'

const allIconNames = Object.keys(PhosphorIcons).filter(key => key.endsWith('Icon'))

interface SystemFunctionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: SystemFunction | null
  onSubmit: (data: SystemFunctionPayload) => void
  isLoading?: boolean
  allFunctions?: SystemFunction[]
}

export function SystemFunctionForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isLoading,
  allFunctions = []
}: SystemFunctionFormProps) {
  const isEditing = !!initialData
  const [openMenuCha, setOpenMenuCha] = useState(false)
  const [openIcon, setOpenIcon] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const form = useForm<SystemFunctionPayload>({
    resolver: zodResolver(systemFunctionSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      url: '',
      order: 0,
      type: '',
      icon: '',
      isShow: true,
      parentId: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          code: initialData.code || '',
          name: initialData.name ? initialData.name.replace(/^\|\s*([—-]\s*)*/, '') : '',
          url: initialData.url || '',
          order: initialData.order || 0,
          type: initialData.type || '',
          icon: initialData.icon || '',
          isShow: initialData.isShow ?? true,
          parentId: initialData.parentId === "00000000-0000-0000-0000-000000000000" ? "" : (initialData.parentId || ''),
        })
      } else {
        form.reset({
          code: '',
          name: '',
          url: '',
          order: 0,
          type: '',
          icon: '',
          isShow: true,
          parentId: '',
        })
      }
    } else {
      setTimeout(() => {
        form.reset({
          code: '',
          name: '',
          url: '',
          order: 0,
          type: '',
          icon: '',
          isShow: true,
          parentId: '',
        })
      }, 200)
    }
  }, [initialData, open, form])

  const handleSubmit = (values: SystemFunctionPayload) => {
    onSubmit(values)
  }

  const buildTreeOptions = (items: SystemFunction[], parentId: string | null = null, depth = 0, parentPath = ""): any[] => {
    let result: any[] = [];
    const children = items.filter(item => 
      (parentId === null && (!item.parentId || item.parentId === "00000000-0000-0000-0000-000000000000")) || 
      item.parentId === parentId
    );
    
    for (const child of children) {
      if (initialData && child.id === initialData.id) continue;
      
      const cleanName = child.name.replace(/^\|\s*(—\s*)*/, '');
      const currentPath = parentPath ? `${parentPath} > ${cleanName}` : cleanName;
      const hasChildren = items.some(i => i.parentId === child.id);
      
      result.push({ 
        value: child.id, 
        label: cleanName,
        depth,
        hasChildren,
        path: currentPath
      });
      
      if (hasChildren && expandedIds.has(child.id) && depth < 10) {
        result = result.concat(buildTreeOptions(items, child.id, depth + 1, currentPath));
      }
    }
    return result;
  }
  
  const treeOptions = buildTreeOptions(allFunctions);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Chỉnh sửa chức năng' : 'Thêm mới chức năng'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Cập nhật thông tin của chức năng trong hệ thống.' : 'Điền các thông tin cơ bản để tạo chức năng mới.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã chức năng <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Mã" {...field} />
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
                    <FormLabel>Tên chức năng <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Textarea rows={1} className="resize-y"  placeholder="Tên chức năng" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => {
                  const selectedOption = treeOptions.find(opt => opt.value === field.value);
                  
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel className="uppercase font-bold text-xs text-foreground tracking-wide mb-1">Chức năng cha</FormLabel>
                      <Popover open={openMenuCha} onOpenChange={setOpenMenuCha} modal={true}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "flex w-full max-w-full justify-between items-center font-normal min-h-10 h-auto py-2 px-3 rounded-lg overflow-hidden whitespace-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value && field.value !== "none" && selectedOption ? (
                                <Badge variant="secondary" className="bg-muted text-foreground hover:bg-neutral-200 flex items-center gap-1 font-normal text-sm py-1.5 px-3 rounded-lg max-w-full h-auto whitespace-normal">
                                  <span className="block flex-1 min-w-0 text-left whitespace-normal wrap-break-word" title={selectedOption.path}>{selectedOption.path}</span>
                                  <div 
                                    className="shrink-0 rounded-full hover:bg-neutral-300 p-0.5 cursor-pointer ml-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      field.onChange("");
                                    }}
                                  >
                                    <XIcon className="h-3 w-3" />
                                  </div>
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground/70">Chọn chức năng cha</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Tìm kiếm" className="h-10" />
                            <CommandEmpty>Không tìm thấy chức năng nào.</CommandEmpty>
                            <CommandList className="max-h-64">
                              <CommandGroup>
                                {treeOptions.map((option: any) => (
                                  <CommandItem
                                    value={option.label}
                                    key={option.value}
                                    onSelect={() => {
                                      field.onChange(option.value)
                                      setOpenMenuCha(false)
                                    }}
                                    className="cursor-pointer flex items-center py-2.5"
                                  >
                                    <div className="flex items-center w-full" style={{ paddingLeft: `${option.depth * 20}px` }}>
                                      {option.hasChildren ? (
                                        <div 
                                          className="cursor-pointer mr-1.5 flex items-center justify-center p-0.5 hover:bg-neutral-200 rounded text-muted-foreground"
                                          onClick={(e) => toggleExpand(option.value, e)}
                                        >
                                          {expandedIds.has(option.value) ? <CaretDownIcon className="w-4 h-4 shrink-0" /> : <CaretRightIcon className="w-4 h-4 shrink-0" />}
                                        </div>
                                      ) : (
                                        <span className="w-5.5 shrink-0" />
                                      )}
                                      {field.value === option.value ? (
                                        <RadioButtonIcon className="w-4 h-4 mr-2 text-indigo-600 shrink-0" weight="fill" />
                                      ) : (
                                        <CircleIcon className="w-4 h-4 mr-2 text-muted-foreground/70 shrink-0" />
                                      )}
                                      <span className={cn("text-sm", field.value === option.value ? "font-medium text-foreground" : "text-foreground")}>
                                        {option.label}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Đường dẫn (URL)</FormLabel>
                  <FormControl>
                    <Input placeholder="Đường dẫn" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 rounded-lg w-full">
                          <SelectValue placeholder="Chọn loại" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="folder">
                          <div className="flex items-center gap-2">
                            <FolderIcon className="w-4 h-4 text-amber-500" />
                            <span>Folder (Thư mục)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="function">
                          <div className="flex items-center gap-2">
                            <GearIcon className="w-4 h-4 text-blue-500" />
                            <span>Function (Chức năng)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="button">
                          <div className="flex items-center gap-2">
                            <HandPointingIcon className="w-4 h-4 text-emerald-500" />
                            <span>Button (Nút bấm)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thứ tự</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => {
                  const SelectedIcon = field.value ? (PhosphorIcons as any)[field.value] : null;
                  
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Biểu tượng</FormLabel>
                      <Popover open={openIcon} onOpenChange={setOpenIcon} modal={true}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between font-normal h-8 px-3 py-1 text-sm rounded-lg",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                <div className="flex items-center gap-2">
                                  {SelectedIcon && <SelectedIcon className="w-4 h-4 text-indigo-600" />}
                                  <span className="truncate max-w-30">{field.value}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/70">Chọn biểu tượng</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-75 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Tìm kiếm biểu tượng..." className="h-10" />
                            <CommandEmpty>Không tìm thấy biểu tượng.</CommandEmpty>
                            <CommandList className="max-h-64">
                              <CommandGroup>
                                {/* Render all icons so search works across the entire library */}
                                {allIconNames.map((iconName) => {
                                  const IconComponent = (PhosphorIcons as any)[iconName];
                                  return (
                                    <CommandItem
                                      key={iconName}
                                      value={iconName}
                                      onSelect={() => {
                                        field.onChange(iconName);
                                        setOpenIcon(false);
                                      }}
                                      className="cursor-pointer flex items-center py-2"
                                    >
                                      {IconComponent && <IconComponent className="w-4 h-4 mr-2 text-muted-foreground" />}
                                      <span>{iconName}</span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              
              <FormField
                control={form.control}
                name="isShow"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="invisible">Trạng thái</FormLabel>
                    <div className="flex flex-row items-center space-x-2.5 rounded-lg border border-input px-2.5 h-8">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer font-normal text-sm">
                        Hiển thị
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 min-w-30 rounded-lg">
                <XIcon className="w-4 h-4 mr-2" />
                Hủy bỏ
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-10 min-w-30 rounded-lg">
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
