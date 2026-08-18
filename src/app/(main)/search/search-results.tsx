"use client";

import { useMemo } from "react";
import { SearchBar as SearchBarComponent, SearchCategory } from "@/components/search-bar";
import { MediaCard } from "@/components/media-card";
import { FilterButtons } from "@/components/filter-buttons";

interface SearchResultsProps {
  query: string;
  category: "music";
  field: string;
  initialMusic: any[];
  initialArtists: any[];
  initialTracks: any[];
}

export default function SearchResults({ query, category, field, initialMusic, initialArtists, initialTracks }: SearchResultsProps) {
  const MUSIC_FIELDS = [
    { value: "", label: "All fields" },
    { value: "album", label: "Album" },
    { value: "artist", label: "Artist" },
    { value: "track", label: "Track" },
  ] as const;

  const fields = MUSIC_FIELDS;
  const activeField = field || "all";

  const results = useMemo(() => {
    const combined = [...initialMusic, ...initialArtists, ...initialTracks];
    return combined.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));
  }, [initialMusic, initialArtists, initialTracks]);

  const total = results.length;

  const getIcon = (type: string) => {
    switch (type) {
      case "music": return "music";
      case "artist": return "artist";
      case "track": return "track";
      default: return "music";
    }
  };

  const getIdPrefix = (type: string) => {
    switch (type) {
      case "music": return "m";
      case "artist": return "a";
      case "track": return "t";
      default: return "m";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">
          Results for "{query}" (Music)
        </h1>
        <div className="max-w-md flex-1">
          <SearchBarComponent initialValue={query} initialCategory={category} />
        </div>
      </div>

      {total === 0 ? (
        <p className="text-muted-foreground">No results found. Try a different search or field.</p>
      ) : (
        <>
          <FilterButtons fields={fields} activeField={activeField} query={query} category={category} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map((item: any) => {
              const type = item.type || "music";
              return (
                <MediaCard key={`${getIdPrefix(type)}-${item.id}`} {...item} icon={getIcon(type)} />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}