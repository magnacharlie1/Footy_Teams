"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MetricOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  options: MetricOption[];
};

export function LeagueMetricSelect({ value, options }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        const params = new URLSearchParams(searchParams.toString());
        if (next === "totalPoints") {
          params.delete("metric");
        } else {
          params.set("metric", next);
        }
        const query = params.toString();
        router.replace(query ? `?${query}` : "?");
      }}
    >
      <SelectTrigger className="h-9 w-[220px]">
        <SelectValue placeholder="Table view" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
