import { redirect } from "next/navigation";
import { CoverImage } from "@/components/media-card";
import { RequestButton } from "@/components/request-button";
import { prisma } from "@/lib/prisma";
import {
  getBookDetails,
  getReleaseDetails,
  getReleaseTracks,
  getReleaseCover,
} from "@/lib/search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportIssueButton } from "@/components/report-issue-button";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default async function DetailPage({
  params,
}: {
  params: { type: string; id: string };
}) {
  const { type, id } = params;
  if (!["book", "music"].includes(type)) redirect("/");

  if (type === "book") {
    const details = await getBookDetails(id);
    if (!details || !details.title) redirect("/");

    const coverId = details.covers?.[0];
    const coverUrl = coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : undefined;

    const authors = details.authors || [];
    const authorNames: string[] = [];
    for (const a of authors) {
      if (a?.author?.key) {
        try {
          const res = await fetch(`https://openlibrary.org${a.author.key}.json`);
          const data = await res.json();
          if (data.name) authorNames.push(data.name);
        } catch {}
      }
    }

    const alreadyInLibrary = await prisma.libraryItem.findFirst({
      where: { externalId: id, type: "book" },
    });
    const alreadyRequested = await prisma.request.findFirst({
      where: { externalId: id, type: "book", status: { in: ["pending", "approved"] } },
    });

    return (
      <div className="space-y-8">
        <Button variant="ghost" size="sm" className="gap-1" render={<Link href="/" />}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex flex-col gap-8 md:flex-row">
          <div className="w-56 shrink-0">
            <CoverImage coverUrl={coverUrl} title={details.title} type="book" />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold">{details.title}</h1>
              {authorNames.length > 0 && (
                <p className="mt-1 text-lg text-muted-foreground">
                  by {authorNames.join(", ")}
                </p>
              )}
            </div>

            {details.subtitle && <p className="text-muted-foreground">{details.subtitle}</p>}

            {details.description && (
              <p className="max-w-2xl leading-relaxed text-muted-foreground">
                {typeof details.description === "string"
                  ? details.description
                  : details.description.value}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {details.subject_places?.slice(0, 3).map((s: string) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
              {details.first_publish_date && (
                <Badge variant="outline">{details.first_publish_date}</Badge>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <RequestButton
                item={{
                  type: "book",
                  title: details.title,
                  subtitle: authorNames.join(", ") || undefined,
                  coverUrl,
                  externalId: id,
                  externalUrl: `https://openlibrary.org/works/${id}`,
                }}
                disabled={!!alreadyInLibrary || !!alreadyRequested}
              />
              {alreadyInLibrary && <Badge variant="success">Already in library</Badge>}
              {alreadyRequested && <Badge variant="outline">Requested</Badge>}
              <Button
                variant="outline"
                className="gap-1"
                render={
                  <a
                    href={`https://openlibrary.org/works/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <ExternalLink className="h-4 w-4" /> Open Library
              </Button>
              <ReportIssueButton
                itemTitle={details.title}
                itemType="book"
                itemId={id}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Music release
  const details = await getReleaseDetails(id);
  if (!details || !details.title) redirect("/");

  const tracks = await getReleaseTracks(id);
  const coverUrl = await getReleaseCover(id);
  const artists = (details["artist-credit"] || [])
    .map((ac: any) => ac.name || ac.artist?.name || "")
    .filter(Boolean)
    .join(", ");

  const alreadyInLibrary = await prisma.libraryItem.findFirst({
    where: { externalId: id, type: "music" },
  });
  const alreadyRequested = await prisma.request.findFirst({
    where: { externalId: id, type: "music", status: { in: ["pending", "approved"] } },
  });

  const totalLengthMs = tracks.reduce((acc: number, t: any) => acc + (t.length || 0), 0);
  const formatMs = (ms: number) =>
    `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" className="gap-1" render={<Link href="/" />}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="flex flex-col gap-8 md:flex-row">
        <div className="w-56 shrink-0">
          <CoverImage coverUrl={coverUrl} title={details.title} type="music" />
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{details.title}</h1>
            {artists && <p className="mt-1 text-lg text-muted-foreground">by {artists}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {details.date && <Badge variant="outline">{details.date}</Badge>}
            <Badge variant="secondary">{tracks.length} tracks</Badge>
            {totalLengthMs > 0 && <Badge variant="secondary">{formatMs(totalLengthMs)}</Badge>}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <RequestButton
              item={{
                type: "music",
                title: details.title,
                subtitle: artists || undefined,
                coverUrl,
                externalId: id,
                externalUrl: `https://musicbrainz.org/release/${id}`,
              }}
              disabled={!!alreadyInLibrary || !!alreadyRequested}
            />
            {alreadyInLibrary && <Badge variant="success">Already in library</Badge>}
            {alreadyRequested && <Badge variant="outline">Requested</Badge>}
              <Button
                variant="outline"
                className="gap-1"
                render={
                  <a
                    href={`https://musicbrainz.org/release/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <ExternalLink className="h-4 w-4" /> MusicBrainz
              </Button>
              <ReportIssueButton
                itemTitle={details.title}
                itemType="music"
                itemId={id}
              />
            </div>
        </div>
      </div>

      {tracks.length > 0 && (
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3 font-medium">Track listing</div>
          <ol className="divide-y">
            {tracks.map((track: any) => (
              <li key={track.id} className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-right text-xs text-muted-foreground">
                    {track.position}
                  </span>
                  <span>{track.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatMs(track.length || 0)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}