import { getSettings } from "@/lib/settings";
import { IntegrationsClient } from "./integrations-client";

export default async function AdminIntegrationsPage() {
  const settings = await getSettings();
  return <IntegrationsClient initial={settings as any} />;
}