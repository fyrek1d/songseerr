"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Save } from "lucide-react";

type Settings = {
  openLibraryEnabled: boolean;
  googleBooksEnabled: boolean;
  musicBrainzEnabled: boolean;
  autoApproveTrusted: boolean;
  requestLimit: number;
  webhookUrl?: string;
};

export function SettingsClient({ initial }: { initial: Settings }) {
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
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
      toast({ title: "Settings saved", variant: "success" });
      router.refresh();
    } else {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Request Rules</h1>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metadata providers</CardTitle>
          <CardDescription>
            Enable/disable search providers. Open Library is primary for books; Google
            Books is the fallback. MusicBrainz powers music discovery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Open Library</Label>
              <p className="text-xs text-muted-foreground">Primary book metadata source</p>
            </div>
            <Switch
              checked={settings.openLibraryEnabled}
              onCheckedChange={(v) => update("openLibraryEnabled", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Google Books</Label>
              <p className="text-xs text-muted-foreground">Fallback book metadata source</p>
            </div>
            <Switch
              checked={settings.googleBooksEnabled}
              onCheckedChange={(v) => update("googleBooksEnabled", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>MusicBrainz</Label>
              <p className="text-xs text-muted-foreground">Music discovery and metadata</p>
            </div>
            <Switch
              checked={settings.musicBrainzEnabled}
              onCheckedChange={(v) => update("musicBrainzEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request rules</CardTitle>
          <CardDescription>Control how requests flow through the queue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-approve trusted users</Label>
              <p className="text-xs text-muted-foreground">
                Requests from Trusted users skip the queue.
              </p>
            </div>
            <Switch
              checked={settings.autoApproveTrusted}
              onCheckedChange={(v) => update("autoApproveTrusted", v)}
            />
          </div>
          <div className="space-y-2">
            <Label>Request limit (per 30 days)</Label>
            <Input
              type="number"
              min={1}
              value={settings.requestLimit}
              onChange={(e) => update("requestLimit", parseInt(e.target.value) || 1)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            A webhook (e.g. ntfy.sh or Discord) receives request lifecycle events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Webhook URL</Label>
          <Input
            value={settings.webhookUrl || ""}
            onChange={(e) => update("webhookUrl", e.target.value)}
            placeholder="https://ntfy.sh/your-topic"
          />
        </CardContent>
      </Card>
    </div>
  );
}