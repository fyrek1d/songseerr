"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CoverImage } from "@/components/media-card";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Search, Trash2, X } from "lucide-react";

type Collection = {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  user: { username: string };
  items: Array<{
    id: string;
    title: string;
    artist?: string;
    coverUrl?: string;
    externalId: string;
    type: string;
  }>;
};

export function CollectionDetailClient({
  collection,
  isOwner,
}: {
  collection: Collection;
  isOwner: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  async function search(q: string) {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults([...data.books, ...data.music]);
    setSearching(false);
  }

  async function addItem(item: any) {
    const res = await fetch(`/api/collections/${collection.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item: {
          title: item.title,
          artist: item.subtitle,
          coverUrl: item.coverUrl,
          externalId: item.id,
          externalUrl: item.externalUrl,
          type: item.type,
        },
      }),
    });
    if (res.status === 409) {
      toast({ title: "Already in collection", variant: "destructive" });
    } else if (res.ok) {
      toast({ title: "Added to collection", variant: "success" });
      router.refresh();
    }
  }

  async function removeItem(itemId: string) {
    const res = await fetch(`/api/collections/${collection.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "removeItem", itemId }),
    });
    if (res.ok) {
      toast({ title: "Removed from collection" });
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/collections")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{collection.name}</h1>
            <Badge variant={collection.isPublic ? "secondary" : "outline"}>
              {collection.isPublic ? "Public" : "Private"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            by {collection.user.username}
          </p>
        </div>
        {isOwner && (
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4" /> Add item
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to {collection.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => search(e.target.value)}
                    placeholder="Search books and music..."
                    className="pl-9"
                    autoFocus
                  />
                </div>
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {searching && <p className="text-sm text-muted-foreground">Searching...</p>}
                  {results.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex items-center gap-3 rounded-md border p-2"
                    >
                      <div className="w-8 shrink-0">
                        <CoverImage
                          coverUrl={item.coverUrl}
                          title={item.title}
                          type={item.type}
                          className="aspect-[2/3]"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                      </div>
                      <Button size="sm" onClick={() => addItem(item)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {query.length >= 2 && results.length === 0 && !searching && (
                    <p className="text-sm text-muted-foreground">No results.</p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {collection.description && (
        <p className="max-w-2xl text-muted-foreground">{collection.description}</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {collection.items.map((item) => (
          <div key={item.id} className="group relative overflow-hidden rounded-lg border bg-card">
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
            </div>
            {isOwner && (
              <button
                onClick={() => removeItem(item.id)}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}