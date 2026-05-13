import * as Network from "expo-network";

type DiscoveryResult = {
  wsUrl: string;
  host: string;
};

export async function discoverHub(port = 8765): Promise<DiscoveryResult | null> {
  const ipAddress = await Network.getIpAddressAsync();
  const prefix = subnetPrefix(ipAddress);
  if (!prefix) {
    return null;
  }

  const candidates = Array.from({ length: 254 }, (_, index) => `${prefix}.${index + 1}`);
  const ownHost = ipAddress;
  const ordered = [
    ownHost.replace(/\.\d+$/, ".1"),
    ownHost.replace(/\.\d+$/, ".2"),
    ...candidates.filter((host) => host !== ownHost),
  ];

  const batchSize = 24;
  for (let index = 0; index < ordered.length; index += batchSize) {
    const batch = ordered.slice(index, index + batchSize);
    const found = await Promise.any(batch.map((host) => probeHub(host, port))).catch(() => null);
    if (found) {
      return found;
    }
  }

  return null;
}

function subnetPrefix(ipAddress: string): string | null {
  const match = ipAddress.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/);
  if (!match) {
    return null;
  }
  return `${match[1]}.${match[2]}.${match[3]}`;
}

async function probeHub(host: string, port: number): Promise<DiscoveryResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 550);
  try {
    const response = await fetch(`http://${host}:${port}/health`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error("Health check failed");
    }
    const payload = (await response.json()) as { status?: string };
    if (payload.status !== "ok") {
      throw new Error("Not an AI Minutes Hub");
    }
    return { host, wsUrl: `ws://${host}:${port}/ws/client` };
  } finally {
    clearTimeout(timer);
  }
}
