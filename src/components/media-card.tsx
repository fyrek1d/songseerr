"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Music, Users, Music2, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaCardProps {
  id: string;
  type: "book" | "music" | "artist" | "track";
  title: string;
  subtitle?: string;
  coverUrl?: string;
  year?: number;
  className?: string;
  icon?: LucideIcon;
}

const typeConfig = {
  book: { label: "Book", icon: BookOpen },
  music: { label: "Album", icon: Music },
  artist: { label: "Artist", icon: Users },
  track: { label: "Track", icon: Music2 },
} as const;

export function CoverImage({
  coverUrl,
  title,
  type,
  className,
}: {
  coverUrl?: string;
  title: string;
  type: "book" | "music" | "artist" | "track";
  className?: string;
}) {
  const config = typeConfig[type];
  const Icon = config.icon;
  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted",
        className
      )}
    >
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 200px"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-muted">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export function MediaCard({
  id,
  type,
  title,
  subtitle,
  coverUrl,
  year,
  className,
  icon,
}: MediaCardProps) {
  const config = typeConfig[type];
  const BadgeIcon = icon || config.icon;
  return (
    <Link href={`/detail/${type}/${id}`} className={cn("group block", className)}>
      <Card className="overflow-hidden transition-all group-hover:border-primary/50 group-hover:shadow-lg">
        <CardContent className="p-0">
          <div className="relative">
            <CoverImage coverUrl={coverUrl} title={title} type={type} />
            <Badge
              className="absolute left-2 top-2 bg-background/80 backdrop-blur"
              variant="secondary"
            >
              <BadgeIcon className="mr-1 h-3 w-3" />
              {config.label}
            </Badge>
          </div>
          <div className="p-3">
            <h3 className="line-clamp-2 text-sm font-semibold">{title}</h3>
            {subtitle && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{subtitle}</p>
            )}
            {year && <p className="mt-1 text-xs text-muted-foreground">{year}</p>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}