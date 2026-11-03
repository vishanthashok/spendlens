import { ArrowLeftRight, CreditCard, LayoutDashboard, PieChart, Receipt } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Toaster } from "sonner";

import { useMeta } from "../hooks/useSpend";
import { cn } from "../lib/cn";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight, end: false },
  { to: "/cards", label: "Cards", icon: CreditCard, end: false },
  { to: "/budgets", label: "Budgets", icon: PieChart, end: false },
  { to: "/receipts", label: "Receipts", icon: Receipt, end: false },
];

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-ink">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-lime" />
      </span>
      <span className="text-base font-semibold tracking-tight">SpendLens</span>
    </div>
  );
}

function NavItems({ onClick }: { onClick?: () => void }) {
  return (
    <>
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClick}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-full px-3 py-2 text-sm whitespace-nowrap",
                isActive ? "bg-ink text-white" : "text-muted hover:bg-white hover:text-ink",
              )
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            {item.label}
          </NavLink>
        );
      })}
    </>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const meta = useMeta();
  const company = meta.data?.companyName ?? "Northwind Studio";
  const period = meta.data?.periodLabel ?? "October 2026";

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-[#f7f8f3] px-4 py-5 md:flex">
        <Wordmark />
        <nav className="mt-8 flex flex-col gap-1" aria-label="Primary">
          <NavItems />
        </nav>
        <div className="mt-auto rounded-2xl border border-line bg-white p-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-faint">Workspace</div>
          <div className="mt-1 font-medium">{company}</div>
          <div className="text-xs text-muted">{period} close</div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Wordmark />
            <span className="text-xs text-muted">{period}</span>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3" aria-label="Primary">
            <NavItems />
          </nav>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
      <Toaster theme="light" position="bottom-right" />
    </div>
  );
}
