"use client";

import { useEffect, useMemo, useRef } from "react";
import * as Plot from "@observablehq/plot";

type LeaguePoint = {
  playerId: string;
  playerName: string;
  date: string;
  value: number;
};

type Props = {
  data: LeaguePoint[];
  yLabel: string;
};

const palette = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

export function LeagueMetricChart({ data, yLabel }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const legendRef = useRef<HTMLDivElement | null>(null);
  const setActiveRef = useRef<(playerId: string | null) => void>(() => {});
  const { sortedData, players, colorByPlayer } = useMemo(() => {
    const seen = new Map<string, string>();
    for (const point of data) {
      if (!seen.has(point.playerId)) {
        seen.set(point.playerId, point.playerName);
      }
    }
    const list = Array.from(seen.entries()).map(([id, name], index) => ({
      id,
      name,
      color: palette[index % palette.length],
    }));
    const grouped = new Map<string, LeaguePoint[]>();
    for (const point of data) {
      const listPoints = grouped.get(point.playerId) ?? [];
      listPoints.push(point);
      grouped.set(point.playerId, listPoints);
    }
    const ordered = Array.from(grouped.values()).flatMap((points) =>
      [...points].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    );
    const colorMap = new Map(list.map((player) => [player.id, player.color]));
    return { sortedData: ordered, players: list, colorByPlayer: colorMap };
  }, [data]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    if (sortedData.length === 0) return;

    const dateFormatter = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
    const maxValue = Math.max(0, ...sortedData.map((point) => point.value));
    const yMax = Math.max(1, Math.ceil(maxValue * 1.1));

    const grouped = new Map<string, LeaguePoint[]>();
    for (const point of sortedData) {
      const list = grouped.get(point.playerId) ?? [];
      list.push(point);
      grouped.set(point.playerId, list);
    }

    const lineMarks = players.map((player) =>
      Plot.lineY(grouped.get(player.id) ?? [], {
        x: (d) => new Date(d.date),
        y: "value",
        stroke: player.color,
        strokeOpacity: 1,
        strokeWidth: 1.6,
        curve: "monotone-x",
        className: `player-line player-${player.id}`,
        class: `player-line player-${player.id}`,
      }),
    );

    const hitMarks = players.map((player) =>
      Plot.lineY(grouped.get(player.id) ?? [], {
        x: (d) => new Date(d.date),
        y: "value",
        stroke: player.color,
        strokeOpacity: 0,
        strokeWidth: 18,
        curve: "monotone-x",
        className: `player-hit player-${player.id}`,
        class: `player-hit player-${player.id}`,
        pointerEvents: "stroke",
      }),
    );

    const plot = Plot.plot({
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12,
      },
      height: 320,
      marginTop: 16,
      marginRight: 16,
      marginBottom: 56,
      marginLeft: 60,
      x: {
        type: "utc",
        label: "Session",
        tickRotate: -20,
        tickPadding: 6,
        tickSize: 6,
        tickFormat: (d) => dateFormatter.format(d as Date),
      },
      y: {
        label: yLabel,
        labelAnchor: "top",
        labelOffset: 14,
        domain: [0, yMax],
        tickPadding: 6,
        tickSize: 6,
        tickFormat: (d) => Number(d).toFixed(0),
      },
      marks: [
        Plot.gridY({ stroke: "#cbd5e1", strokeOpacity: 0.9 }),
        Plot.ruleY([0], { stroke: "#94a3b8", strokeOpacity: 0.6 }),
        Plot.axisX(),
        Plot.axisY(),
        ...lineMarks,
        ...hitMarks,
        Plot.dot(
          sortedData,
          Plot.pointer({
            x: (d) => new Date(d.date),
            y: "value",
            r: 6,
            fill: "white",
            stroke: (d) => colorByPlayer.get(d.playerId) ?? "#0f766e",
            strokeWidth: 2,
          }),
        ),
      ],
    });

    containerRef.current.append(plot);

    const lineElements = Array.from(
      containerRef.current.querySelectorAll("[class~='player-line']"),
    ) as Element[];
    if (lineElements.length === 0) {
      return () => {
        plot.remove();
      };
    }
    const activeIdFromClass = (el: Element) => {
      const match = Array.from(el.classList).find(
        (name) => name.startsWith("player-") && name !== "player-line" && name !== "player-hit",
      );
      return match ? match.replace(/^player-/, "") : "";
    };

    const setLineStyle = (el: Element, opacity: string, strokeWidth: string) => {
      (el as HTMLElement).style.opacity = opacity;
      const paths = el.querySelectorAll("path");
      paths.forEach((path) => {
        (path as SVGPathElement).style.opacity = opacity;
        (path as SVGPathElement).style.strokeWidth = strokeWidth;
      });
      if ((el as SVGPathElement).style) {
        (el as SVGPathElement).style.opacity = opacity;
        (el as SVGPathElement).style.strokeWidth = strokeWidth;
      }
    };

    const setActive = (playerId: string | null) => {
      lineElements.forEach((el) => {
        const id = activeIdFromClass(el);
        if (!id) return;
        if (!playerId) {
          setLineStyle(el, "1", "1.6");
          return;
        }
        if (id === playerId) {
          setLineStyle(el, "1", "3");
          return;
        }
        setLineStyle(el, "0.45", "1.2");
      });

      if (legendRef.current) {
        const legendItems = Array.from(
          legendRef.current.querySelectorAll("[data-player-id]"),
        ) as HTMLElement[];
        legendItems.forEach((item) => {
          const id = item.dataset.playerId ?? "";
          if (!playerId) {
            item.style.opacity = "1";
            return;
          }
          item.style.opacity = id === playerId ? "1" : "0.45";
        });
      }
    };
    setActiveRef.current = setActive;

    const svg = containerRef.current.querySelector("svg");
    const onMove = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const hit = target?.closest?.("[class~='player-hit']") as Element | null;
      if (!hit) return;
      const id = activeIdFromClass(hit);
      if (id) setActive(id);
    };
    const onLeave = () => setActive(null);

    svg?.addEventListener("pointermove", onMove);
    svg?.addEventListener("pointerleave", onLeave);

    return () => {
      svg?.removeEventListener("pointermove", onMove);
      svg?.removeEventListener("pointerleave", onLeave);
      plot.remove();
    };
  }, [sortedData, yLabel, players, colorByPlayer]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
      <div ref={containerRef} className="w-full font-sans text-sm lg:flex-1" />
      {players.length ? (
        <div
          ref={legendRef}
          className="flex flex-wrap gap-3 text-xs text-muted-foreground lg:w-44 lg:flex-col"
        >
          {players.map((player) => (
            <div
              key={player.id}
              data-player-id={player.id}
              className="flex items-center gap-2"
              onMouseEnter={() => setActiveRef.current(player.id)}
              onMouseLeave={() => setActiveRef.current(null)}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: player.color }}
              />
              <span>{player.name}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
