import { Button } from '@/components/ui/button';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react';

interface TableRefreshButtonProps {
  hasNewData: boolean;
  onRefresh: () => void;
}

export function TableRefreshButton({ hasNewData, onRefresh }: TableRefreshButtonProps) {
  return (
    <Button 
      onClick={onRefresh} 
      variant={hasNewData ? "default" : "outline"}
      className={`h-10 transition-all ${hasNewData ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md" : ""}`}
    >
      <ArrowsClockwiseIcon className={`w-4 h-4 mr-2 ${hasNewData ? 'animate-spin' : ''}`} />
      Làm mới
    </Button>
  );
}
