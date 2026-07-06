// Broker SSE in-memory — contrat MONO-INSTANCE assumé et documenté (cahier §7, §11.1.5) :
// les connexions vivent dans la mémoire d'une instance unique. L'interface (subscribe/
// publish) est le point de branchement d'un adaptateur externe (Redis pub/sub…) si un
// jour le multi-nœud devient nécessaire — on ne le construit pas maintenant.

export interface SseEvent {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  createdAt: string;
}

type Client = { send: (event: SseEvent) => void };

const clients = new Map<string, Set<Client>>();

export function subscribe(userId: string, client: Client): () => void {
  let set = clients.get(userId);
  if (!set) {
    set = new Set();
    clients.set(userId, set);
  }
  set.add(client);
  return () => {
    set.delete(client);
    if (set.size === 0) clients.delete(userId);
  };
}

export function publish(userId: string, event: SseEvent): void {
  const set = clients.get(userId);
  if (!set) return;
  for (const client of set) {
    try {
      client.send(event);
    } catch {
      set.delete(client); // connexion morte : on nettoie, sans bruit
    }
  }
}

export function connectedUsers(): number {
  return clients.size;
}
