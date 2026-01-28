"use client";

import { useEffect, useMemo, useState } from "react";
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

    fetch(`/api/breadcrumbs?path=${encodeURIComponent(pathname)}`)
      .then((response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (!isActive || !data?.labels) return;
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
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = labels[item.href] ?? item.label;
          return (
            <li key={item.href} className="flex items-center gap-2">
              {isLast ? (
                <span className="font-semibold text-foreground">{label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-foreground"
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
