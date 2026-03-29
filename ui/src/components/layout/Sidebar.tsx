"use client";

import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/SidebarContext";
import {
  MessageSquareIcon,
  UsersIcon,
  MailIcon,
  ShieldCheckIcon,
  PhoneIcon,
  MessageCircleIcon,
  SettingsIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  LogOutIcon,
  UserIcon,
  CreditCardIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/lib/auth-client";

const navItems = [
  { href: "/", label: "Chat", icon: MessageSquareIcon },
  { href: "/inbox", label: "Inbox", icon: MailIcon },
  { href: "/sms", label: "Texts", icon: MessageCircleIcon },
  { href: "/calls", label: "Calls", icon: PhoneIcon },
  { href: "/contacts", label: "Contacts", icon: UsersIcon },
  { href: "/approvals", label: "Approvals", icon: ShieldCheckIcon, badge: true },
];

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { data: session } = useSession();

  // Profile menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ bottom: 0, left: 0 });

  const expanded = !collapsed || hovered;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch("/api/approvals?status=pending")
      .then((r) => r.json())
      .then((data) => setPendingCount(data.approvals?.length ?? 0))
      .catch(() => {});
  }, [pathname]);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({
      bottom: window.innerHeight - rect.top + 8,
      left: rect.left,
    });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    updateMenuPosition();
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen, updateMenuPosition]);

  const isManaged = process.env.NEXT_PUBLIC_COMMS_MANAGED === "true";

  return (
    <aside
      onMouseEnter={() => collapsed && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "fixed left-3 top-3 bottom-3 bg-surface-1 border border-border rounded-2xl flex flex-col transition-[width] duration-300 z-50 shadow-elevation-2 overflow-hidden",
        expanded ? "w-56" : "w-16"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
        <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
          <span className="text-accent font-bold text-sm">C</span>
        </div>
        {expanded && (
          <span className="font-semibold text-foreground text-sm tracking-tight truncate">
            Comms
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors relative",
                active
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground/80 hover:bg-surface-2/50"
              )}
            >
              <Icon className="size-[18px] flex-shrink-0" />
              {expanded && <span className="truncate">{label}</span>}
              {badge && pendingCount > 0 && (
                <span
                  className={cn(
                    "bg-accent-amber text-black text-[10px] font-bold rounded-full flex items-center justify-center",
                    expanded
                      ? "ml-auto px-1.5 min-w-[20px] h-5"
                      : "absolute -top-1 -right-1 w-4 h-4 text-[9px]"
                  )}
                >
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer — Profile + Collapse */}
      <div className="px-2 py-3 border-t border-border space-y-0.5">
        {/* Profile / Account button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors w-full cursor-pointer",
            menuOpen
              ? "bg-surface-2 text-foreground"
              : "text-muted-foreground hover:text-foreground/80 hover:bg-surface-2/50"
          )}
        >
          <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-accent to-[#BF5AF2] flex items-center justify-center flex-shrink-0">
            <UserIcon className="size-2.5 text-white" />
          </div>
          {expanded && <span className="truncate">Account</span>}
        </button>

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground hover:text-foreground/70 hover:bg-surface-2/50 transition-colors w-full cursor-pointer"
        >
          {collapsed ? (
            <PanelLeftOpenIcon className="size-[18px] flex-shrink-0" />
          ) : (
            <>
              <PanelLeftCloseIcon className="size-[18px] flex-shrink-0" />
              {expanded && <span>Collapse</span>}
            </>
          )}
        </button>
      </div>

      {/* Profile menu portal */}
      {menuOpen && mounted && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[100]"
          style={{ bottom: menuPos.bottom, left: menuPos.left }}
        >
          <div className="w-52 bg-surface-1 border border-border rounded-2xl shadow-elevation-2 overflow-hidden py-1.5">
            <button
              type="button"
              onClick={() => { setMenuOpen(false); router.push("/settings"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left text-foreground/80 hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <SettingsIcon className="size-3.5 text-muted-foreground flex-shrink-0" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); router.push("/settings"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left text-foreground/80 hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <CreditCardIcon className="size-3.5 text-muted-foreground flex-shrink-0" />
              <span>Billing</span>
            </button>

            <div className="h-px bg-border my-1.5 mx-3" />

            {(session || isManaged) && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  fetch("/api/auth/signout", { method: "POST" }).then(() => { window.location.href = "/login"; });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <LogOutIcon className="size-3.5 flex-shrink-0" />
                <span>Sign out</span>
              </button>
            )}

            <div className="px-3 pt-2 pb-1 text-[11px] text-muted-foreground/30 border-t border-border mt-1.5">
              Comms v0.1.2
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
}
