import { useQueryClient } from '@tanstack/react-query'
import type { SystemFunction } from '@/lib/api/system/systemFunction'

export function usePermission() {
  const queryClient = useQueryClient()
  
  const checkPermission = (code: string) => {
    const allData = queryClient.getQueryData<{ data: SystemFunction[] }>(['systemFunctionsMy'])
    const functions = allData?.data || []
    const func = functions.find(f => f.code === code)

    if (!func) return false

    return true
  }

  return { checkPermission }
}
