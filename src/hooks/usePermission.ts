import { useQuery } from '@tanstack/react-query'
import { systemFunctionApi, type SystemFunction } from '@/lib/api/system/systemFunction'

export function usePermission() {
  const { data: allData, isLoading } = useQuery({
    queryKey: ['systemFunctionsMy'],
    queryFn: systemFunctionApi.getMyFunctions,
    staleTime: 5 * 60 * 1000,
  })
  
  const checkPermission = (code: string): boolean => {
    const functions: SystemFunction[] = allData?.data || []
    return functions.some(f => f.code === code)
  }

  return { checkPermission, isLoading }
}

