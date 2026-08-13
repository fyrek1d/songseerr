import { SearchBar } from "@/components/search-bar";
import { MediaCard } from "@/components/media-card";
import {
  getPopularBooks,
  getPopularMusic,
  getTodayBookCategories,
  getTodayMusicGenres,
} from "@/lib/discover";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Re-render periodically so the daily-rotated discovery picks stay fresh
// without a full rebuild.
export const revalidate = 21600;

const DISCOVER_QUERIES = [
  { label: "Popular Fiction", query: "fiction bestseller" },
  { label: "New Nonfiction", query: "nonfiction 2024" },
  { label: "Classic Literature", query: "classic literature" },
  { label: "Rock Classics", query: "rock classic album" },
  { label: "Electronic", query: "electronic music" },
  { label: "Jazz", query: "jazz" },
];

export default async function DiscoverPage() {
  const [books, music, todayBooks, todayMusic] = await Promise.all([
    getPopularBooks(),
    getPopularMusic(),
    getTodayBookCategories(),
    getTodayMusicGenres(),
  ]);

  const booksSubtitle = todayBooks.map((b) => b.label).join(", ");
  const musicSubtitle = todayMusic.map((m) => m.label).join(", ");

  return (
    <div className="space-y-10">
      <section className="space-y-4 py-8 text-center">
        <h1 className="text-4xl font-bold">Discover books & music</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Search your next read or favorite album, request it, and it lands in your library.
        </p>
        <div className="mx-auto max-w-xl">
          <SearchBar />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Popular Books</h2>
            <p className="text-sm text-muted-foreground">Today: {booksSubtitle}</p>
          </div>
          <Link
            href={`/search?q=${encodeURIComponent(todayBooks[0]?.query ?? "fiction")}`}
            className="flex items-center text-sm text-primary hover:underline"
          >
            See all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {books.map((book) => (
            <MediaCard key={book.id} {...book} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Popular Music</h2>
            <p className="text-sm text-muted-foreground">Today: {musicSubtitle}</p>
          </div>
          <Link
            href={`/search?q=${encodeURIComponent(todayMusic[0]?.label ?? "rock")}`}
            className="flex items-center text-sm text-primary hover:underline"
          >
            See all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {music.map((release) => (
            <MediaCard key={release.id} {...release} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {DISCOVER_QUERIES.slice(2).map(({ label, query }) => (
          <Link
            key={label}
            href={`/search?q=${encodeURIComponent(query)}`}
            className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
          >
            <span className="font-medium">{label}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </section>
    </div>
  );
}