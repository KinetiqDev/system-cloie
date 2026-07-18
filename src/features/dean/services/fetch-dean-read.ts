export class DeanPageReadNotFoundError extends Error {}

type DeanReadRoute = (request: Request) => Promise<Response>;

export async function fetchDeanRead<T>(route: DeanReadRoute, path: string): Promise<T> {
  const response = await route(new Request(`http://dean-read.internal${path}`));

  if (response.status === 404) throw new DeanPageReadNotFoundError();
  if (!response.ok) throw new Error(`Dean read request failed: ${response.status}`);
  return response.json() as Promise<T>;
}
