"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Save } from "lucide-react";

type Settings = {
  libraryIntegration: {
    jellyfin?: { url: string; apiKey: string };
    audiobookshelf?: { url: string; apiKey: string };
    navidrome?: { url: string; username?: string; password: string };
    readarr?: {
      url: string;
      apiKey: string;
      rootFolderId?: number;
      qualityProfileId?: number;
      metadataProfileId?: number;
    };
    lidarr?: {
      url: string;
      apiKey: string;
      rootFolderId?: number;
      qualityProfileId?: number;
      metadataProfileId?: number;
    };
  };
};

export function IntegrationsClient({ initial }: { initial: Settings }) {
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);

  const integrations = settings.libraryIntegration;

  function updateIntegration(key: keyof Settings["libraryIntegration"], field: string, value: string) {
    setSettings((s) => ({
      ...s,
      libraryIntegration: {
        ...s.libraryIntegration,
        [key]: { ...(s.libraryIntegration[key] as any), [field]: value },
      },
    }));
  }

  function updateIntegrationNumber(
    key: keyof Settings["libraryIntegration"],
    field: string,
    value: string
  ) {
    setSettings((s) => ({
      ...s,
      libraryIntegration: {
        ...s.libraryIntegration,
        [key]: { ...(s.libraryIntegration[key] as any), [field]: parseInt(value, 10) || 0 },
      },
    }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: "Integrations saved", variant: "success" });
      router.refresh();
    } else {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  async function rescan() {
    setScanning(true);
    const res = await fetch("/api/library/scan", { method: "POST" });
    const data = await res.json();
    setScanning(false);
    if (res.ok) {
      const summary = data.results.map((r: any) => `${r.source}: +${r.added}`).join(", ");
      toast({ title: "Scan complete", description: summary, variant: "success" });
      router.refresh();
    } else {
      toast({ title: "Scan failed", variant: "destructive" });
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Library Integrations</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={rescan} disabled={scanning}>
            <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning..." : "Rescan"}
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jellyfin</CardTitle>
          <CardDescription>
            Detects music albums and books already in your Jellyfin library.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Server URL</Label>
            <Input
              value={integrations.jellyfin?.url || ""}
              onChange={(e) => updateIntegration("jellyfin", "url", e.target.value)}
              placeholder="http://jellyfin:8096"
            />
          </div>
          <div className="space-y-2">
            <Label>API key</Label>
            <Input
              type="password"
              value={integrations.jellyfin?.apiKey || ""}
              onChange={(e) => updateIntegration("jellyfin", "apiKey", e.target.value)}
              placeholder="Dashboard → API Keys"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audiobookshelf</CardTitle>
          <CardDescription>
            Detects audiobooks and ebooks already available in Audiobookshelf.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Server URL</Label>
            <Input
              value={integrations.audiobookshelf?.url || ""}
              onChange={(e) => updateIntegration("audiobookshelf", "url", e.target.value)}
              placeholder="http://audiobookshelf:13378"
            />
          </div>
          <div className="space-y-2">
            <Label>API token</Label>
            <Input
              type="password"
              value={integrations.audiobookshelf?.apiKey || ""}
              onChange={(e) => updateIntegration("audiobookshelf", "apiKey", e.target.value)}
              placeholder="Settings → Users → Token"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Navidrome</CardTitle>
          <CardDescription>
            Subsonic-API-based music detection (optional).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Server URL</Label>
            <Input
              value={integrations.navidrome?.url || ""}
              onChange={(e) => updateIntegration("navidrome", "url", e.target.value)}
              placeholder="http://navidrome:4533"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={integrations.navidrome?.username || ""}
                onChange={(e) => updateIntegration("navidrome", "username", e.target.value)}
                placeholder="admin"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={integrations.navidrome?.password || ""}
                onChange={(e) => updateIntegration("navidrome", "password", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Readarr (Books)</CardTitle>
          <CardDescription>
            Push book requests directly to Readarr. Queries the library to check
            for existing items and adds new books on approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Server URL</Label>
            <Input
              value={integrations.readarr?.url || ""}
              onChange={(e) => updateIntegration("readarr", "url", e.target.value)}
              placeholder="http://readarr:8787"
            />
          </div>
          <div className="space-y-2">
            <Label>API key</Label>
            <Input
              type="password"
              value={integrations.readarr?.apiKey || ""}
              onChange={(e) => updateIntegration("readarr", "apiKey", e.target.value)}
              placeholder="Settings → General → API Key"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Root folder ID</Label>
              <Input
                type="number"
                value={integrations.readarr?.rootFolderId || ""}
                onChange={(e) => updateIntegrationNumber("readarr", "rootFolderId", e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Quality profile ID</Label>
              <Input
                type="number"
                value={integrations.readarr?.qualityProfileId || ""}
                onChange={(e) =>
                  updateIntegrationNumber("readarr", "qualityProfileId", e.target.value)
                }
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Metadata profile ID</Label>
              <Input
                type="number"
                value={integrations.readarr?.metadataProfileId || ""}
                onChange={(e) =>
                  updateIntegrationNumber("readarr", "metadataProfileId", e.target.value)
                }
                placeholder="1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lidarr (Music)</CardTitle>
          <CardDescription>
            Push approved music requests to Lidarr. Queries the library for
            existing albums/artists before submitting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Server URL</Label>
            <Input
              value={integrations.lidarr?.url || ""}
              onChange={(e) => updateIntegration("lidarr", "url", e.target.value)}
              placeholder="http://lidarr:8686"
            />
          </div>
          <div className="space-y-2">
            <Label>API key</Label>
            <Input
              type="password"
              value={integrations.lidarr?.apiKey || ""}
              onChange={(e) => updateIntegration("lidarr", "apiKey", e.target.value)}
              placeholder="Settings → General → API Key"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Root folder ID</Label>
              <Input
                type="number"
                value={integrations.lidarr?.rootFolderId || ""}
                onChange={(e) => updateIntegrationNumber("lidarr", "rootFolderId", e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Quality profile ID</Label>
              <Input
                type="number"
                value={integrations.lidarr?.qualityProfileId || ""}
                onChange={(e) =>
                  updateIntegrationNumber("lidarr", "qualityProfileId", e.target.value)
                }
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Metadata profile ID</Label>
              <Input
                type="number"
                value={integrations.lidarr?.metadataProfileId || ""}
                onChange={(e) =>
                  updateIntegrationNumber("lidarr", "metadataProfileId", e.target.value)
                }
                placeholder="1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}