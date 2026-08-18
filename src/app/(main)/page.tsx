import { SearchBar } from "@/components/search-bar";
import Dashboard from "@/components/dashboard";
import Link from "next/link";
import { ArrowRight, Music as MusicIcon } from "lucide-react";

const DISCOVER_QUERIES = [
  { label: "Rock Classics", query: "rock classic album" },
  { label: "Electronic Beats", query: "electronic music" },
  { label: "Jazz Essentials", query: "jazz" },
  { label: "Hip Hop Hits", query: "hip hop" },
  { label: "Pop Anthems", query: "pop" },
  { label: "Classical Masterpieces", query: "classical" },
];

export default async function DiscoverPage() {
  return (
    <div className="container-main space-y-12">
      <section className="page-section text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
          <MusicIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Discover & Request Music</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
          Discover Great Music
        </h1>
        <p className="mt-6 mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground">
          Search for your favorite albums, artists, or tracks and add them to your collection.
        </p>
        <div className="mt-10 mx-auto max-w-2xl">
          <SearchBar />
        </div>
      </section>

      <section className="page-section">
        <Dashboard />
      </section>

      <section className="page-section">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">Explore by Genre</h2>
          <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
            Dive into different musical styles and find your next favorite.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DISCOVER_QUERIES.map(({ label, query }) => (
            <Link
              key={label}
              href={`/search?q=${encodeURIComponent(query)}`}
              className="group flex h-20 w-full items-center justify-between px-6 py-4 rounded-xl bg-card border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 card-hover"
            >
              <div className="flex-1">
                <span className="text-lg font-semibold">{label}</span>
                <p className="mt-1 text-sm text-muted-foreground">{query}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}