import { SearchBar } from "@/components/search-bar";
import Dashboard from "@/components/dashboard";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
    <div className="space-y-12">
      <section className="space-y-6 py-12 text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
          Discover Great Music
        </h1>
        <p className="mt-6 mx-auto max-w-2xl text-xl text-muted-foreground">
          Search for your favorite albums, artists, or tracks and add them to your collection.
        </p>
        <div className="mt-8 mx-auto max-w-xl">
          <SearchBar />
        </div>
      </section>

      {/* Dashboard replaces Today's Picks */}
      <section className="space-y-8">
        <Dashboard />
      </section>

      <section className="space-y-8">
        <h2 className="text-2xl font-bold text-center">
          Explore by Genre
        </h2>
        <p className="mt-4 text-center text-muted-foreground max-w-xl mx-auto">
          Dive into different musical styles and find your next favorite.
        </p>
        
        <div className="mt-8 gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {DISCOVER_QUERIES.map(({ label, query }) => (
              <Link
                key={label}
                href={`/search?q=${encodeURIComponent(query)}`}
                className="group flex h-16 w-full items-center justify-between px-6 py-4 rounded-xl border border-muted/20 bg-background/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              >
                <div className="flex-1">
                  <span className="text-lg font-medium">{label}</span>
                  <p className="mt-1 text-sm text-muted-foreground">{query}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}