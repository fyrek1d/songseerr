"use client";

import { Button } from "@/components/ui/button";

interface FilterButtonsProps {
  fields: readonly { value: string; label: string }[];
  activeField: string;
  query: string;
  category: "music";
}

export function FilterButtons({ fields, activeField, query, category }: FilterButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {fields.map((f) => (
        <Button
          key={f.value || "all"}
          variant={activeField === (f.value || "all") ? "default" : "outline"}
          size="sm"
          onClick={() => {
            const params = new URLSearchParams({ q: query, category });
            if (f.value) params.set("field", f.value);
            window.location.href = `/search?${params.toString()}`;
          }}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}