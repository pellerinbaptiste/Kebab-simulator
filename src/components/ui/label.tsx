import * as React from "react";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase leading-none select-none", className)}
      {...props}
    />
  );
}

export { Label };
