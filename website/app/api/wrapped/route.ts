import { readPublicCompetitionState } from "../../lib/publicCompetition";

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character] ?? character;
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ign = url.searchParams.get("player")?.trim() ?? "";
  const { snapshot } = await readPublicCompetitionState();
  const seasonal = snapshot?.seasonalLeaderboard.find(
    (entry) => entry.ign.toLocaleLowerCase() === ign.toLocaleLowerCase(),
  );
  const lifetime = snapshot?.lifetimeLeaderboard.find(
    (entry) => entry.ign.toLocaleLowerCase() === ign.toLocaleLowerCase(),
  );
  const player = seasonal ?? lifetime;

  if (!player) {
    return Response.json({ error: "Player is not publicly ranked." }, {
      status: 404,
    });
  }

  const season = snapshot?.season?.name ?? "Vora Competition";
  const context = seasonal ? "SEASON STANDING" : "LIFETIME STANDING";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#071321"/><stop offset="1" stop-color="#0b2545"/></linearGradient>
    <linearGradient id="cyan" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#1fc8ff"/><stop offset="1" stop-color="#2563eb"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <path d="M0 520 L360 160 L620 420 L900 90 L1200 390 V630 H0Z" fill="#0b3b70" opacity=".22"/>
  <rect x="60" y="55" width="1080" height="520" rx="28" fill="#07111f" stroke="#1fc8ff" stroke-opacity=".45"/>
  <text x="105" y="120" fill="#1fc8ff" font-family="monospace" font-size="22" letter-spacing="6">VORA WRAPPED · ${escapeXml(context)}</text>
  <text x="105" y="220" fill="#f8fafc" font-family="Arial,sans-serif" font-size="72" font-weight="700">${escapeXml(player.ign)}</text>
  <text x="105" y="270" fill="#8ab7ef" font-family="Arial,sans-serif" font-size="26">${escapeXml(season)}</text>
  <rect x="105" y="325" width="300" height="145" rx="18" fill="#0b1d33" stroke="#24476b"/>
  <rect x="450" y="325" width="300" height="145" rx="18" fill="#0b1d33" stroke="#24476b"/>
  <rect x="795" y="325" width="300" height="145" rx="18" fill="#0b1d33" stroke="#24476b"/>
  <text x="135" y="370" fill="#7dd3fc" font-family="monospace" font-size="18">RSR</text>
  <text x="135" y="430" fill="#f8fafc" font-family="Arial,sans-serif" font-size="48" font-weight="700">${player.rsr}</text>
  <text x="480" y="370" fill="#7dd3fc" font-family="monospace" font-size="18">DIVISION</text>
  <text x="480" y="430" fill="#f8fafc" font-family="Arial,sans-serif" font-size="38" font-weight="700">${escapeXml(player.division)}</text>
  <text x="825" y="370" fill="#7dd3fc" font-family="monospace" font-size="18">RECORD</text>
  <text x="825" y="430" fill="#f8fafc" font-family="Arial,sans-serif" font-size="38" font-weight="700">#${player.rank} · ${player.winRate.toFixed(1)}%</text>
  <text x="105" y="535" fill="#94a3b8" font-family="Arial,sans-serif" font-size="20">${player.matchesPlayed} verified matches · ${player.wins} wins · voramlbb.com</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      ...(url.searchParams.get("download") === "1"
        ? {
            "Content-Disposition": `attachment; filename="vora-wrapped-${player.ign.replace(/[^a-z0-9_-]/gi, "-")}.svg"`,
          }
        : {}),
    },
  });
}
