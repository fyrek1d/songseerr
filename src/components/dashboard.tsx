import { prisma } from "@/lib/prisma";
import { getLidarrConfig, getNavidromeConfig } from "@/lib/settings";
import Link from "next/link";

export async function getDashboardStats() {
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
  
  const system = "Music Request System";

  return {
    active,
    completed,
    downloads: libraryCount,
    attention,
    healthy,
    system,
  };
}

export async function getRecentRequests(limit = 5) {
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

export default async function Dashboard() {
  const stats = await getDashboardStats();
  const recentRequests = await getRecentRequests();
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Active</h3>
          <p className="text-2xl font-bold">{stats.active}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Completed</h3>
          <p className="text-2xl font-bold">{stats.completed}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Downloads</h3>
          <p className="text-2xl font-bold">{stats.downloads}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Attention</h3>
          <p className="text-2xl font-bold">{stats.attention}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Healthy</h3>
          <p className="text-2xl font-bold">
            <span className={stats.healthy ? "text-green-500" : "text-red-500"}>
              ●
            </span>
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">System</h3>
          <p className="text-sm font-medium">{stats.system}</p>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Requests</h2>
          <Link href="/requests" className="text-sm font-medium text-muted-foreground hover:text-primary">
            View All
          </Link>
        </div>
        <div className="space-y-3">
          {recentRequests.length > 0 ? (
            recentRequests.map((request) => (
              <div key={request.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{request.title}</p>
                  {request.subtitle && (
                    <p className="text-xs text-muted-foreground">{request.subtitle}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${request.status === "pending" ? "bg-yellow-100 text-yellow-800" : request.status === "approved" ? "bg-blue-100 text-blue-800" : request.status === "available" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{request.status}</span>
                    <span className="text-xs text-muted-foreground">
                      by {request.user.username}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No recent requests</p>
          )}
        </div>
      </div>
    </div>
  );
}