import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

import { cn } from "../lib/cn";

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30",
  {
    variants: {
      variant: {
        primary: "bg-ink text-white hover:bg-black",
        lime: "bg-lime text-ink hover:brightness-95",
        outline: "border border-line bg-white text-ink hover:bg-paper",
        ghost: "text-ink hover:bg-black/5",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-full border border-line bg-white px-4 text-sm text-ink outline-none placeholder:text-faint focus:border-ink",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 rounded-full border border-line bg-white px-3 text-sm text-ink outline-none focus:border-ink",
        className,
      )}
      {...props}
    />
  );
}

const badgeStyles = cva("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", {
  variants: {
    tone: {
      neutral: "bg-paper-2 text-ink",
      lime: "bg-lime text-ink",
      review: "bg-amber/20 text-warn",
      danger: "bg-danger/10 text-danger",
      moss: "bg-moss/10 text-moss",
      quiet: "bg-transparent text-faint",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({
  tone,
  className,
  children,
}: {
  tone?: VariantProps<typeof badgeStyles>["tone"];
  className?: string;
  children: ReactNode;
}) {
  return <span className={cn(badgeStyles({ tone }), className)}>{children}</span>;
}

export function Meter({
  value,
  max,
  tone = "limit",
  className,
}: {
  value: number;
  max: number;
  tone?: "limit" | "neutral";
  className?: string;
}) {
  const ratio = max <= 0 ? 0 : value / max;
  const width = Math.min(100, ratio * 100);
  const bar = tone === "neutral" ? "bg-ink" : ratio > 1 ? "bg-danger" : ratio >= 0.8 ? "bg-amber" : "bg-ink";
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-paper-2", className)}>
      <div className={cn("h-full rounded-full", bar)} style={{ width: `${width}%` }} />
    </div>
  );
}

export function LoadingBlock({ label = "Pulling the October ledger…" }: { label?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <p className="text-sm text-muted">{label}</p>
      <div className="h-28 animate-pulse rounded-3xl bg-white" />
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-3xl bg-white" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-3xl bg-white" />
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-6 md:p-8">
      <p className="text-[11px] uppercase tracking-[0.16em] text-faint">SpendLens</p>
      <h2 className="mt-2 font-serif text-3xl tracking-tight">The ledger didn't load.</h2>
      <p className="mt-3 max-w-lg text-sm text-muted">
        Start the API on port 43124, then try again. {message}
      </p>
      <Button className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function EmptyBlock({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-16 text-center">
      <h2 className="font-serif text-3xl tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
