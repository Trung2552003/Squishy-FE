import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useEntityRefresh(entityName: string) {
  const [hasNewData, setHasNewData] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleEntityChanged = (e: any) => {
      const { entityName: changedEntity, senderId } = e.detail;
      if (changedEntity === entityName) {
        // Try to get current user ID from the cache
        const meData: any = queryClient.getQueryData(['me']);
        const currentUserId = meData?.data?.id;
        
        // If the sender is the current user, ignore the update
        if (currentUserId && senderId === currentUserId) {
          return;
        }
        
        setHasNewData(true);
      }
    };
    
    window.addEventListener('EntityChanged', handleEntityChanged);
    return () => window.removeEventListener('EntityChanged', handleEntityChanged);
  }, [entityName]);

  const resetNewData = useCallback(() => {
    setHasNewData(false);
  }, []);

  return { hasNewData, resetNewData };
}
