const HEALTH_HEADERS = {
  "Cache-Control": "no-store",
} as const;

export function GET(): Response {
  return Response.json(
    {
      status: "ok",
      service: "System CLOIE",
    },
    { headers: HEALTH_HEADERS }
  );
}
