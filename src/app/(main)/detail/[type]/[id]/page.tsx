import { redirect } from "next/navigation";
import { CoverImage } from "@/components/media-card";
import { RequestButton } from "@/components/request-button";
import { prisma } from "@/lib/prisma";
import {
  getReleaseDetails,
  getReleaseTracks,
  getReleaseCover,
  getReleaseGroupCover,
  getArtistDetails,
  getArtistReleases,
  getRecordingDetails,
} from "@/lib/search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { ReportIssueButton } from "@/components/report-issue-button";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

const formatMs = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

export default async function DetailPage({
  params,
}: {
  params: { type: string; id: string };
}) {
  const { type, id } = params;
  if (!["music", "artist", "track"].includes(type)) redirect("/");

  if (type === "music") {
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

    return (
      <div className="space-y-8">
        <BackButton />

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

  if (type === "artist") {
    const details = await getArtistDetails(id);
    if (!details || !details.name) redirect("/");

    const releases = await getArtistReleases(id);
    const covers = await Promise.all(
      releases.map((rel: any) =>
        getReleaseGroupCover(rel["release-group"]?.id).catch(() => undefined)
      )
    );

    const alreadyRequested = await prisma.request.findFirst({
      where: { externalId: id, type: "artist", status: { in: ["pending", "approved"] } },
    });

    const artistImage = details._image || covers.find(Boolean);
    const bio =
      details._bio ||
      details.disambiguation ||
      `${details.name} is a music artist.`;

    return (
      <div className="space-y-8">
        <BackButton />

        <div className="flex flex-col gap-8 md:flex-row">
          <div className="w-56 shrink-0">
            <CoverImage
              coverUrl={artistImage}
              title={details.name}
              type="artist"
            />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold">{details.name}</h1>
              {details.country && (
                <p className="mt-1 text-lg text-muted-foreground">from {details.country}</p>
              )}
            </div>

            <p className="max-w-2xl leading-relaxed text-muted-foreground">
              {bio}
            </p>

            <div className="flex flex-wrap gap-2">
              {details.type && <Badge variant="secondary">{details.type}</Badge>}
              {details["life-span"]?.begin && (
                <Badge variant="outline">
                  Active since {details["life-span"].begin.slice(0, 4)}
                </Badge>
              )}
              <Badge variant="secondary">{releases.length} releases</Badge>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <RequestButton
                item={{
                  type: "artist",
                  title: details.name,
                  subtitle: details.name,
                  externalId: id,
                  externalUrl: `https://musicbrainz.org/artist/${id}`,
                }}
                disabled={!!alreadyRequested}
              />
              {alreadyRequested && <Badge variant="outline">Requested</Badge>}
              <Button
                variant="outline"
                className="gap-1"
                render={
                  <a
                    href={`https://musicbrainz.org/artist/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <ExternalLink className="h-4 w-4" /> MusicBrainz
              </Button>
              {details._wikiUrl && (
                <Button
                  variant="outline"
                  className="gap-1"
                  render={
                    <a
                      href={details._wikiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <ExternalLink className="h-4 w-4" /> Wikipedia
                </Button>
              )}
              <ReportIssueButton
                itemTitle={details.name}
                itemType="artist"
                itemId={id}
              />
            </div>
          </div>
        </div>

        {releases.length > 0 && (
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3 font-medium">Releases</div>
            <ol className="divide-y">
              {releases.map((rel: any, i: number) => (
                <li key={rel.id} className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3">
                    {covers[i] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={covers[i]} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted" />
                    )}
                    <div>
                      <Link
                        href={`/detail/music/${rel.id}`}
                        className="font-medium hover:underline"
                      >
                        {rel.title}
                      </Link>
                      {rel.date && (
                        <p className="text-xs text-muted-foreground">
                          {rel.date}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {rel["release-group"]?.["primary-type"] || "Release"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  }
  // track
  const details = await getRecordingDetails(id);
  if (!details || !details.title) redirect("/");

  const artists = (details["artist-credit"] || [])
    .map((ac: any) => ac.name || ac.artist?.name || "")
    .filter(Boolean)
    .join(", ");

  const release = details.releases?.[0];

  const alreadyRequested = await prisma.request.findFirst({
    where: {
      externalId: release?.id || id,
      type: "track",
      status: { in: ["pending", "approved"] }
    },
  });

  return (
    <div className="space-y-8">
      <BackButton />

      <div className="flex flex-col gap-8 md:flex-row">
        <div className="w-56 shrink-0">
          <CoverImage coverUrl={undefined} title={details.title} type="track" />
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{details.title}</h1>
            {artists && <p className="mt-1 text-lg text-muted-foreground">by {artists}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {details.length > 0 && <Badge variant="secondary">{formatMs(details.length)}</Badge>}
            {release?.title && <Badge variant="outline">{release.title}</Badge>}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <RequestButton
              item={{
                type: "track",
                title: release?.title || details.title,
                subtitle: artists ? `${artists} — ${release?.title || "single"}` : undefined,
                externalId: release?.id || id,
                externalUrl: release?.id
                  ? `https://musicbrainz.org/release/${release.id}`
                  : `https://musicbrainz.org/recording/${id}`,
              }}
              disabled={!!alreadyRequested}
            />
            {alreadyRequested && <Badge variant="outline">Requested</Badge>}
            {release?.id && (
              <>
                <Button
                  variant="outline"
                  className="gap-1"
                  render={<Link href={`/detail/music/${release.id}`} />}
                >
                  View album
                </Button>
              </>
            )}
            <Button
              variant="outline"
              className="gap-1"
              render={
                <a
                  href={`https://musicbrainz.org/recording/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <ExternalLink className="h-4 w-4" /> MusicBrainz
            </Button>
            <ReportIssueButton
              itemTitle={details.title}
              itemType="track"
              itemId={id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}