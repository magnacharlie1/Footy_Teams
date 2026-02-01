"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type BreadcrumbItem = {
  href: string;
  label: string;
  parentSegment?: string;
};

function formatSegment(segment: string) {
  const clean = decodeURIComponent(segment.replace(/[-_]+/g, " "));
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function fallbackLabelFor(segment: string, parentSegment?: string) {
  if (parentSegment === "groups") return "Group";
  if (parentSegment === "sessions") return "Session";
  if (parentSegment === "players") return "Player";
  return formatSegment(segment);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const [labels, setLabels] = useState<Record<string, string>>({});
  const cacheRef = useRef<Map<string, Record<string, string>>>(new Map());

  const items = useMemo<BreadcrumbItem[]>(() => {
    if (!pathname || pathname === "/") {
      return [];
    }

    const segments = pathname.split("/").filter(Boolean);
    const hidden = new Set(["sessions", "players"]);

    return segments
      .map((segment, index) => {
        if (hidden.has(segment)) {
          return null;
        }
        const parentSegment = segments[index - 1];
        const label = fallbackLabelFor(segment, parentSegment);
        const href = "/" + segments.slice(0, index + 1).join("/");
        return { href, label, parentSegment };
      })
      .filter(Boolean) as BreadcrumbItem[];
  }, [pathname]);

  useEffect(() => {
    let isActive = true;

    if (!pathname || pathname === "/") {
      setLabels({});
      return;
    }

    const cached = cacheRef.current.get(pathname);
    if (cached) {
      setLabels(cached);
      return;
    }

    fetch(`/api/breadcrumbs?path=${encodeURIComponent(pathname)}`)
      .then((response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (!isActive || !data?.labels) return;
        cacheRef.current.set(pathname, data.labels);
        setLabels(data.labels);
      })
      .catch(() => {
        if (!isActive) return;
        setLabels({});
      });

    return () => {
      isActive = false;
    };
  }, [pathname]);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = labels[item.href] ?? item.label;
          return (
            <li key={item.href} className="flex min-w-0 items-center gap-2">
              {isLast ? (
                <span className="max-w-[12rem] truncate font-semibold text-foreground sm:max-w-none">
                  {label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="max-w-[12rem] truncate transition-colors hover:text-foreground sm:max-w-none"
                >
                  {label}
                </Link>
              )}
              {!isLast ? <span aria-hidden="true">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
