import * as React from "react";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("font-mono text-xs font-medium tracking-wider uppercase leading-none select-none", className)}
      {...props}
    />
  );
}

export { Label };
