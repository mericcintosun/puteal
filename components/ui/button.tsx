import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// D8 graphite: compact controls, soft 0.375rem corners, 1px lighter top edge on panels.
// The filled orange variant is reserved for the one primary action on a screen.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-primary bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_var(--edge)] hover:bg-primary/90",
        secondary:
          "border border-border border-t-edge bg-secondary text-secondary-foreground hover:bg-card",
        outline:
          "border border-border border-t-edge bg-card text-foreground hover:border-primary/70 hover:text-foreground",
        ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
        destructive: "border border-bad bg-transparent text-bad hover:bg-secondary",
        link: "h-auto px-0 text-primary underline decoration-primary/50 underline-offset-4 hover:decoration-primary",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-2.5 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
