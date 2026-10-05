import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border-2 border-input bg-background px-3 py-1 text-base outline-none transition-[color,box-shadow] placeholder:text-muted-foreground disabled:opacity-50 focus-visible:border-ring focus-visible:border-primary focus-visible:ring-0 aria-invalid:border-destructive md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
