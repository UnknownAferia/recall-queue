import { getControlSession } from "../../../lib/controlAuth";
import { requestControlOperations } from "../../../lib/controlOperations";

function safeOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return (
    !origin ||
    origin ===
      (process.env.VORA_CONTROL_ORIGIN?.trim() || "https://voramlbb.com")
  );
}

export async function GET() {
  const session = await getControlSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await requestControlOperations(session, "GET"), {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unavailable" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getControlSession();
  if (!session || !safeOrigin(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return Response.json(
      await requestControlOperations(session, "POST", await request.json()),
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Operation failed" },
      { status: 400 },
    );
  }
}
