import { z } from "zod";

const metricSchema = z.object({
  id: z.string().max(200),
  name: z.string().max(32),
  value: z.number().finite(),
  rating: z.string().max(32).optional(),
  navigationType: z.string().max(64).optional(),
  path: z.string().max(500),
});

export async function POST(request: Request) {
  const metric = metricSchema.safeParse(await request.json().catch(() => null));
  if (!metric.success) return Response.json({ code: "INVALID_WEB_VITAL" }, { status: 400 });
  console.info(JSON.stringify({ event: "web_vital", ...metric.data }));
  return new Response(null, { status: 204 });
}
