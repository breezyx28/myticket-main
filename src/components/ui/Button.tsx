import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>
type LegacyVariant = "dark" | "primary" | "danger"
type LegacySize = "md" | "xl"

function normalizeVariant(variant: ButtonVariant | LegacyVariant): ButtonVariant {
  if (variant === "dark" || variant === "primary") return "default"
  if (variant === "danger") return "destructive"
  return variant
}

function normalizeSize(size: ButtonSize | LegacySize): ButtonSize {
  if (size === "md") return "lg"
  if (size === "xl") return "lg"
  return size
}

function legacyVariantClass(variant: ButtonVariant | LegacyVariant) {
  if (variant === "dark") return "bg-ink text-white hover:bg-ink-80"
  if (variant === "primary") return "bg-coral text-white hover:bg-coral/90"
  if (variant === "danger") return "bg-coral text-white hover:bg-coral/90"
  return ""
}

function legacySizeClass(size: ButtonSize | LegacySize) {
  if (size === "md") return "h-11 px-5 text-[14px]"
  if (size === "xl") return "h-12 px-6 text-[15px]"
  return ""
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  loadingText,
  icon: Icon,
  iconRtlFlip = false,
  iconClassName,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  Omit<VariantProps<typeof buttonVariants>, "variant" | "size"> & {
    variant?: ButtonVariant | LegacyVariant
    size?: ButtonSize | LegacySize
    asChild?: boolean
    loading?: boolean
    loadingText?: string
    icon?: React.ComponentType<any>
    /** Mirror directional icons (e.g. arrows) in RTL. */
    iconRtlFlip?: boolean
    iconClassName?: string
  }) {
  const Comp = asChild ? Slot.Root : "button"
  const normalizedVariant = normalizeVariant(variant)
  const normalizedSize = normalizeSize(size)
  const legacyToneClass = legacyVariantClass(variant)
  const legacyScaleClass = legacySizeClass(size)
  const isDisabled = loading || disabled

  return (
    <Comp
      data-slot="button"
      data-variant={normalizedVariant}
      data-size={normalizedSize}
      data-icon={Icon ? "inline-end" : undefined}
      className={cn(
        buttonVariants({ variant: normalizedVariant, size: normalizedSize }),
        legacyToneClass,
        legacyScaleClass,
        className
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="size-3 animate-spin rounded-full border-2 border-current border-r-transparent" />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {Icon ? (
            <Icon
              size={16}
              weight="bold"
              className={cn('shrink-0', iconRtlFlip && 'rtl:-scale-x-100', iconClassName)}
            />
          ) : null}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
