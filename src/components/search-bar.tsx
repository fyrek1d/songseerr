"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchBar({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      startTransition(() => {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search music, artists, albums, tracks..."
          className="pl-12 py-4 text-lg"
        />
        <Button
          type="submit"
          disabled={isPending || !query.trim()}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 px-4 text-sm"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Search
        </Button>
      </div>
    </form>
  );
}