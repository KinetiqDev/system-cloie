"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type RoleSwitcherUser = {
  email: string;
  label: string;
  role: string;
};

type RoleSwitcherProps = {
  activeEmail?: string | null;
  users: readonly RoleSwitcherUser[];
  endpoint: string;
  requestKey: "email" | "identifier";
  storageKey: string;
  title: string;
  description: string;
  expandedStorageKey: string;
  visibilityClassName?: string;
};

function useDraggable(storageKey: string, isExpanded: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const wasDragged = useRef(false);
  const dragStart = useRef<{
    pointerX: number;
    pointerY: number;
    elX: number;
    elY: number;
  } | null>(null);

  const clampPosition = useCallback((x: number, y: number) => {
    const width = containerRef.current?.offsetWidth ?? 288;
    const height = containerRef.current?.offsetHeight ?? 60;

    return {
      x: Math.max(0, Math.min(x, window.innerWidth - width)),
      y: Math.max(0, Math.min(y, window.innerHeight - height)),
    };
  }, []);

  const savePosition = useCallback(
    (nextPosition: { x: number; y: number }) => {
      setPosition(nextPosition);
      window.localStorage.setItem(storageKey, JSON.stringify(nextPosition));
    },
    [storageKey]
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    queueMicrotask(() => {
      try {
        const parsed = JSON.parse(saved) as { x: number; y: number };
        if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
          setPosition(clampPosition(parsed.x, parsed.y));
        }
      } catch {
        // Ignore invalid browser storage.
      }
    });
  }, [clampPosition, storageKey]);

  useEffect(() => {
    const reclamp = () => {
      setPosition((current) => {
        if (!current) return current;
        const next = clampPosition(current.x, current.y);
        if (next.x === current.x && next.y === current.y) return current;
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    };

    queueMicrotask(reclamp);
    window.addEventListener("resize", reclamp);
    return () => window.removeEventListener("resize", reclamp);
  }, [clampPosition, isExpanded, storageKey]);

  const resetPosition = useCallback(() => {
    const nextPosition = {
      x: Math.max(0, window.innerWidth - (containerRef.current?.offsetWidth ?? 288) - 16),
      y: Math.max(0, window.innerHeight - (containerRef.current?.offsetHeight ?? 60) - 16),
    };
    savePosition(nextPosition);
  }, [savePosition]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = container.getBoundingClientRect();
    dragStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      elX: rect.left,
      elY: rect.top,
    };
    isDragging.current = false;
    wasDragged.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragStart.current) return;

      const dx = e.clientX - dragStart.current.pointerX;
      const dy = e.clientY - dragStart.current.pointerY;
      if (!isDragging.current && Math.abs(dx) + Math.abs(dy) < 5) return;

      isDragging.current = true;
      wasDragged.current = true;
      setPosition(clampPosition(dragStart.current.elX + dx, dragStart.current.elY + dy));
    },
    [clampPosition]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);

      if (isDragging.current && dragStart.current) {
        const dx = e.clientX - dragStart.current.pointerX;
        const dy = e.clientY - dragStart.current.pointerY;
        savePosition(clampPosition(dragStart.current.elX + dx, dragStart.current.elY + dy));
      }

      isDragging.current = false;
      dragStart.current = null;
    },
    [clampPosition, savePosition]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        resetPosition();
        return;
      }

      const movement = 16;
      const current = position ?? {
        x: window.innerWidth - 288,
        y: window.innerHeight - 60,
      };
      let nextPosition: { x: number; y: number } | null = null;

      if (e.key === "ArrowLeft") nextPosition = clampPosition(current.x - movement, current.y);
      if (e.key === "ArrowRight") nextPosition = clampPosition(current.x + movement, current.y);
      if (e.key === "ArrowUp") nextPosition = clampPosition(current.x, current.y - movement);
      if (e.key === "ArrowDown") nextPosition = clampPosition(current.x, current.y + movement);
      if (!nextPosition) return;

      e.preventDefault();
      savePosition(nextPosition);
    },
    [clampPosition, position, resetPosition, savePosition]
  );

  return {
    containerRef,
    position,
    isDragging,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onKeyDown,
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        if (wasDragged.current) {
          e.preventDefault();
          wasDragged.current = false;
        }
      },
    },
  };
}

export function RoleSwitcher({
  activeEmail,
  users,
  endpoint,
  requestKey,
  storageKey,
  title,
  description,
  expandedStorageKey,
  visibilityClassName = "block",
}: RoleSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const { containerRef, position, isDragging, dragHandleProps } = useDraggable(storageKey, isExpanded);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(expandedStorageKey);
    if (storedValue === "true") {
      queueMicrotask(() => setIsExpanded(true));
    }
  }, [expandedStorageKey]);

  const switchRole = async (user: RoleSwitcherUser) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [requestKey]: user.email }),
      });
      let data: { success?: boolean; destination?: string; error?: string };

      try {
        data = (await response.json()) as typeof data;
      } catch {
        setError("Role switch failed.");
        return;
      }

      if (!response.ok || !data.success) {
        setError(data.error ?? "Role switch failed.");
        return;
      }

      router.push(data.destination ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Role switch failed.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleRoleClick = (user: RoleSwitcherUser) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    startTransition(() => void switchRole(user));
  };

  const toggleExpanded = () => {
    if (isDragging.current) return;

    setIsExpanded((previous) => {
      const nextValue = !previous;
      window.localStorage.setItem(expandedStorageKey, String(nextValue));
      return nextValue;
    });
  };

  const style: React.CSSProperties = position
    ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
    : {};
  const query = search.toLowerCase();
  const filteredUsers = users.filter(
    (user) =>
      user.label.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
  );

  return (
    <div
      ref={containerRef}
      style={style}
      className={cn(
        "border-border bg-surface/95 z-[60] w-[min(18rem,calc(100vw-2rem))] rounded-2xl border p-3 shadow-xl backdrop-blur",
        visibilityClassName,
        position ? "fixed" : "fixed right-4 bottom-20 md:bottom-4"
      )}
    >
      <div className="flex items-start gap-2">
        <div
          {...dragHandleProps}
          role="button"
          tabIndex={0}
          aria-label="Reposition role switcher; activate to reset position, or use arrow keys to move"
          title="Drag to reposition, activate to reset, or use arrow keys"
          className="text-text-muted hover:bg-surface-muted hover:text-text-secondary flex shrink-0 cursor-grab items-center rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </div>

        <button
          type="button"
          className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
          onClick={toggleExpanded}
          aria-expanded={isExpanded}
          aria-controls={`${storageKey}-panel`}
          aria-label={`${title} role switcher`}
        >
          <div className="min-w-0">
            <p className="text-text-muted truncate text-xs font-semibold tracking-[0.18em] uppercase">
              {title}
            </p>
            <p className="text-text-secondary text-xs">
              {isExpanded ? description : "Click to expand sign-in options"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isPending && <span className="text-text-muted text-xs">...</span>}
            <span className="border-border bg-background text-text-secondary rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
              {isExpanded ? "Hide" : "Show"}
            </span>
          </div>
        </button>
      </div>

      {isExpanded && (
        <div id={`${storageKey}-panel`} className="mt-3 grid">
          <div className="min-h-0">
            <div className="grid max-h-[60vh] gap-1.5 overflow-y-auto pr-1">
            {error && (
              <p role="alert" className="rounded-md border border-red-100 bg-red-50 px-2 py-1.5 text-[11px] text-red-600">
                {error}
              </p>
            )}
            <div className="relative mb-1">
              <Search
                className="text-text-muted pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                id={`${storageKey}-search`}
                name={`${storageKey}-search`}
                aria-label="Search roles"
                placeholder="Search roles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-border bg-background text-text-primary placeholder:text-text-muted w-full rounded-md border py-1.5 pr-2 pl-6 text-[11px] outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {filteredUsers.map((user) => {
              const isActive = user.email === activeEmail;

              return (
                <button
                  key={user.email}
                  type="button"
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                    isActive
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-background hover:border-primary/40 hover:bg-primary-soft/40"
                  )}
                  aria-label={`Switch to ${user.label}`}
                  disabled={isSubmitting}
                  onClick={() => handleRoleClick(user)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{user.label}</p>
                      <p className="text-text-muted truncate text-[10px]">{user.email}</p>
                    </div>
                    <span className="bg-surface-muted text-text-secondary shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase">
                      {user.role.replaceAll("_", " ")}
                    </span>
                  </div>
                </button>
              );
            })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
