"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SearchCategory = "books" | "music";

export function SearchBar({ initialValue = "", initialCategory = "books" }: { initialValue?: string; initialCategory?: SearchCategory }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [category, setCategory] = useState<SearchCategory>(initialCategory);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}&category=${category}`);
    }
  }

  function handleCategoryChange(value: SearchCategory | null) {
    if (value) setCategory(value);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <div className="w-36 shrink-0">
        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="books">Books</SelectItem>
            <SelectItem value="music">Music</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={category === "books" ? "Search books, authors, series..." : "Search music, artists, albums, tracks..."}
          className="pl-9"
        />
      </div>
      <Button type="submit">Search</Button>
    </form>
  );
}