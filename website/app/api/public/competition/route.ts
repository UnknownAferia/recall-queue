import { readPublicCompetitionState } from "../../../lib/publicCompetition";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readPublicCompetitionState();

  if (!state.snapshot) {
    return Response.json(
      {
        available: false,
        stale: true,
        message: "Live competition data is not available yet.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "public, max-age=10, stale-if-error=60",
        },
      },
    );
  }

  return Response.json(
    {
      available: true,
      stale: state.stale,
      data: state.snapshot,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=15, stale-while-revalidate=45",
      },
    },
  );
}
