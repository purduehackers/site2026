import { createClient, type Client } from "@libsql/client/web";

let _client: Client | null = null;

export function getTurso(): Client {
  if (!_client) {
    _client = createClient({
      url: import.meta.env.TURSO_DATABASE_URL,
      authToken: import.meta.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}
