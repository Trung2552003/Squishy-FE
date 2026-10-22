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
      className={`h-8.5 text-xs font-bold px-3 transition-all rounded-lg ${hasNewData ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm" : ""}`}
    >
      <ArrowsClockwiseIcon className={`w-3.5 h-3.5 mr-1.5 ${hasNewData ? 'animate-spin' : ''}`} />
      Làm mới
    </Button>
  );
}
