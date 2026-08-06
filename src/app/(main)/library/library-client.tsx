"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CoverImage } from "@/components/media-card";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Search } from "lucide-react";

type LibraryItem = {
  id: string;
  title: string;
  artist?: string;
  type: string;
  source: string;
  coverUrl?: string;
  addedAt: string;
};

export function LibraryClient({
  items,
  counts,
  isAdmin,
}: {
  items: LibraryItem[];
  counts: { book: number; music: number };
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = useState("");
  const [scanning, setScanning] = useState(false);

  async function rescan() {
    setScanning(true);
    const res = await fetch("/api/library/scan", { method: "POST" });
    const data = await res.json();
    setScanning(false);
    if (res.ok) {
      const summary = data.results
        .map((r: any) => `${r.source}: +${r.added}`)
        .join(", ");
      toast({
        title: "Library scan complete",
        description: summary,
        variant: "success",
      });
      router.refresh();
    } else {
      toast({ title: "Scan failed", variant: "destructive" });
    }
  }

  const filtered = items.filter(
    (i) =>
      !filter ||
      i.title.toLowerCase().includes(filter.toLowerCase()) ||
      (i.artist || "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Library</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter..."
              className="w-64 pl-9"
            />
          </div>
          {isAdmin && (
            <Button onClick={rescan} disabled={scanning}>
              <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning..." : "Rescan"}
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Badge variant="outline">{counts.book} books</Badge>
        <Badge variant="outline">{counts.music} music items</Badge>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
          <TabsTrigger value="book">Books ({counts.book})</TabsTrigger>
          <TabsTrigger value="music">Music ({counts.music})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <ItemGrid items={filtered} />
        </TabsContent>
        <TabsContent value="book" className="mt-4">
          <ItemGrid items={filtered.filter((i) => i.type === "book")} />
        </TabsContent>
        <TabsContent value="music" className="mt-4">
          <ItemGrid items={filtered.filter((i) => i.type === "music")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ItemGrid({ items }: { items: LibraryItem[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground">No items found.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.id} className="overflow-hidden rounded-lg border bg-card">
          <CoverImage
            coverUrl={item.coverUrl}
            title={item.title}
            type={item.type as "book" | "music"}
          />
          <div className="p-2">
            <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
            {item.artist && (
              <p className="line-clamp-1 text-xs text-muted-foreground">{item.artist}</p>
            )}
            <Badge variant="secondary" className="mt-1">
              {item.source}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}