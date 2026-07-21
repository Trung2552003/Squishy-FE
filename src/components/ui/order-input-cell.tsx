import { useState, useEffect } from "react"
import type { Row } from "@tanstack/react-table"

interface OrderInputCellProps<TData> {
  row: Row<TData>
  accessorKey?: string
  onUpdateOrder?: (id: string, val: number) => void
  canEdit: boolean
}

export function OrderInputCell<TData extends { id: string }>({ 
  row, 
  accessorKey = "order", 
  onUpdateOrder, 
  canEdit 
}: OrderInputCellProps<TData>) {
  const initialValue = row.getValue(accessorKey) as number;
  const [value, setValue] = useState<number | string>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  if (!onUpdateOrder || !canEdit) {
    return <div className="text-muted-foreground text-center w-full">{initialValue}</div>;
  }

  return (
    <div className="flex justify-center w-full">
      <input 
        type="number" 
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const numVal = Number(value);
          if (!isNaN(numVal) && numVal !== initialValue) {
            onUpdateOrder(row.original.id, numVal);
          } else {
            setValue(initialValue);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className="w-16 h-8 text-center text-sm rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-neutral-400"
      />
    </div>
  );
}
