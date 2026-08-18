import { prisma } from "@/lib/prisma";
import { getLidarrConfig, getNavidromeConfig, getJellyfinConfig } from "@/lib/settings";
import Link from "next/link";
import {
  Music,
  CheckCircle2,
  AlertCircle,
  Database,
  Activity,
  User,
  ArrowUpRight,
  CheckCheck,
  XCircle,
  Loader2,
  LayoutDashboard,
  Shield,
  ExternalLink,
  HardDrive,
} from "lucide-react";

interface DashboardStats {
  active: number;
  completed: number;
  downloads: number;
  attention: number;
  healthy: boolean;
  system: string;
  integrations: string[];
}

interface RecentRequest {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  externalId: string;
  externalUrl: string | null;
  status: string;
  userId: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  declinedAt: Date | null;
  fulfilledAt: Date | null;
  user: {
    username: string;
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [pendingCount, approvedCount, availableCount, declinedCount] = await Promise.all([
    prisma.request.count({ where: { status: "pending" } }),
    prisma.request.count({ where: { status: "approved" } }),
    prisma.request.count({ where: { status: "available" } }),
    prisma.request.count({ where: { status: "declined" } }),
  ]);

  const active = pendingCount + approvedCount;
  const completed = availableCount;
  const libraryCount = await prisma.libraryItem.count({ where: { type: "music" } });
  const attention = declinedCount;
  
  const [jellyfinConfig, lidarrConfig, navidromeConfig] = await Promise.all([
    getJellyfinConfig(),
    getLidarrConfig(),
    getNavidromeConfig()
  ]);

  // Health is determined by whichever integrations are actually configured:
  // Jellyfin is the primary library source; Lidarr/Navidrome are optional.
  const configured = [
    jellyfinConfig?.url && jellyfinConfig?.apiKey ? "jellyfin" : null,
    lidarrConfig?.url && lidarrConfig?.apiKey ? "lidarr" : null,
    navidromeConfig?.url && navidromeConfig?.password ? "navidrome" : null,
  ].filter(Boolean);
  const healthy = configured.length > 0;
  
  const system = await getStorageInfo();

  return {
    active,
    completed,
    downloads: libraryCount,
    attention,
    healthy,
    system,
    integrations: configured as string[],
  };
}

// Report media-storage usage from the mounted /media volume (HDD with music library).
async function getStorageInfo(): Promise<string> {
  try {
    const { statfs } = await import("node:fs/promises");
    const s = await statfs("/media");
    const total = s.blocks * s.bsize;
    const free = s.bavail * s.bsize;
    const usedPct = total > 0 ? Math.round(((total - free) / total) * 100) : 0;
    return `${usedPct}% used`;
  } catch {
    return "Unavailable";
  }
}

export async function getRecentRequests(limit = 5): Promise<RecentRequest[]> {
  return await prisma.request.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          username: true,
        }
      }
    }
  });
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) {
  return (
    <div className="relative bg-card rounded-xl border border-border flex items-start justify-between gap-4 p-5 sm:p-6 transition-all duration-200 hover:border-primary/40 hover:bg-card/80 card-hover">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
        <p className="text-3xl sm:text-4xl font-bold text-foreground leading-none">{value}</p>
        {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
      </div>
      <div className="flex-shrink-0 p-3 rounded-xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs = {
    pending: { bg: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: Loader2, label: "Pending" },
    approved: { bg: "bg-primary/10 text-primary border-primary/30", icon: CheckCircle2, label: "Approved" },
    available: { bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCheck, label: "Available" },
    declined: { bg: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle, label: "Declined" },
  };
  const config = configs[status as keyof typeof configs] || configs.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export default async function Dashboard() {
  const stats = await getDashboardStats();
  const recentRequests = await getRecentRequests();

  const statCards = [
    { title: "Active Requests", value: stats.active, icon: Activity, description: "Pending + Approved" },
    { title: "Completed", value: stats.completed, icon: CheckCheck, description: "Fulfilled requests" },
    { title: "Library Items", value: stats.downloads, icon: Database, description: "Tracks in Navidrome" },
    { title: "Needs Attention", value: stats.attention, icon: AlertCircle, description: "Declined requests" },
    {
      title: "System Health",
      value: stats.healthy ? "Healthy" : "Degraded",
      icon: Shield,
      description: stats.healthy
        ? `Connected: ${stats.integrations.map((s) => s[0].toUpperCase() + s.slice(1)).join(", ")}`
        : "Check integrations",
    },
    { title: "Media Storage", value: stats.system, icon: HardDrive, description: "Used on media drive" },
  ];

  return (
    <div className="space-y-8 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h2>
            <p className="text-sm text-muted-foreground">Overview of your music request system</p>
          </div>
        </div>
        <Link 
          href="/requests" 
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          View All Requests
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Recent Requests</h3>
              <p className="text-sm text-muted-foreground">Latest activity from your users</p>
            </div>
          </div>
          <Link href="/requests" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            View All
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        
        <div className="divide-y divide-border">
          {recentRequests.length > 0 ? (
            recentRequests.map((request) => (
              <Link 
                key={request.id} 
                href={`/detail/${request.type}/${request.externalId}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors group"
              >
                {request.coverUrl ? (
                  <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img 
                      src={request.coverUrl} 
                      alt={request.title} 
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Music className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{request.title}</p>
                  {request.subtitle && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{request.subtitle}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <StatusBadge status={request.status} />
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {request.user.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
              </Link>
            ))
          ) : (
            <div className="p-16 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <Music className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-medium text-foreground mb-1">No requests yet</h4>
              <p className="text-sm text-muted-foreground mb-6">Be the first to request some music!</p>
              <Link 
                href="/search" 
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Music className="h-4 w-4" />
                Search Music
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}