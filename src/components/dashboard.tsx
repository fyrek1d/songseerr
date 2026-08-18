import { prisma } from "@/lib/prisma";
import { getLidarrConfig, getNavidromeConfig } from "@/lib/settings";
import Link from "next/link";
import {
  Music,
  CheckCircle2,
  AlertCircle,
  Database,
  Server,
  Activity,
  Clock,
  User,
  ArrowUpRight,
  CheckCheck,
  XCircle,
  Loader2,
  LayoutDashboard,
  Shield,
  ExternalLink,
} from "lucide-react";

interface DashboardStats {
  active: number;
  completed: number;
  downloads: number;
  attention: number;
  healthy: boolean;
  system: string;
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
  
  const [lidarrConfig, navidromeConfig] = await Promise.all([
    getLidarrConfig(),
    getNavidromeConfig()
  ]);
  const healthy = !!(lidarrConfig?.url && lidarrConfig?.apiKey && 
                    navidromeConfig?.url && navidromeConfig?.password);
  
  const system = "Songseerr";

  return {
    active,
    completed,
    downloads: libraryCount,
    attention,
    healthy,
    system,
  };
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
  color,
  bgColor,
  description,
  trend,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description?: string;
  trend?: string;
}) {
  return (
    <div className="group relative bg-card rounded-xl border p-5 sm:p-6 transition-all duration-200 hover:shadow-lg hover:border-primary/30 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
          <p className="text-3xl sm:text-4xl font-bold text-foreground">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          {trend && (
            <p className="text-xs text-primary mt-1 flex items-center gap-1">
              <span className="h-3 w-3">↗</span>
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${bgColor} text-${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs = {
    pending: { bg: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: Loader2, label: "Pending" },
    approved: { bg: "bg-primary/10 text-primary dark:bg-primary/20", icon: CheckCircle2, label: "Approved" },
    available: { bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCheck, label: "Available" },
    declined: { bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle, label: "Declined" },
  };
  const config = configs[status as keyof typeof configs] || configs.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export default async function Dashboard() {
  const stats = await getDashboardStats();
  const recentRequests = await getRecentRequests();

  const statCards = [
    {
      title: "Active Requests",
      value: stats.active,
      icon: Activity,
      color: "primary",
      bgColor: "bg-primary/10",
      description: "Pending + Approved",
    },
    {
      title: "Completed",
      value: stats.completed,
      icon: CheckCheck,
      color: "green-500",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      description: "Fulfilled requests",
    },
    {
      title: "Library Items",
      value: stats.downloads,
      icon: Database,
      color: "primary",
      bgColor: "bg-primary/10",
      description: "Tracks in Navidrome",
    },
    {
      title: "Needs Attention",
      value: stats.attention,
      icon: AlertCircle,
      color: "red-500",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      description: "Declined requests",
    },
    {
      title: "System Health",
      value: stats.healthy ? "Healthy" : "Degraded",
      icon: Shield,
      color: stats.healthy ? "green-500" : "red-500",
      bgColor: stats.healthy ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30",
      description: stats.healthy ? "Lidarr + Navidrome connected" : "Check integrations",
    },
    {
      title: "System",
      value: stats.system,
      icon: Server,
      color: "primary",
      bgColor: "bg-primary/10",
      description: "Music Request System",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Dashboard</h2>
            <p className="text-sm text-muted-foreground">Overview of your music request system</p>
          </div>
        </div>
        <Link 
          href="/requests" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          View All Requests
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-5 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Recent Requests</h3>
              <p className="text-sm text-muted-foreground">Latest activity from your users</p>
            </div>
          </div>
          <Link href="/requests" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            View All
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        
        <div className="divide-y">
          {recentRequests.length > 0 ? (
            recentRequests.map((request) => (
              <Link 
                key={request.id} 
                href={`/detail/${request.type}/${request.externalId}`}
                className="flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors group"
              >
                {request.coverUrl && (
                  <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img 
                      src={request.coverUrl} 
                      alt={request.title} 
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{request.title}</p>
                  {request.subtitle && (
                    <p className="text-sm text-muted-foreground truncate">{request.subtitle}</p>
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
            <div className="p-12 text-center">
              <Music className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-foreground mb-1">No requests yet</h4>
              <p className="text-sm text-muted-foreground mb-4">Be the first to request some music!</p>
              <Link 
                href="/search" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
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