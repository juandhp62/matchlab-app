
 // MatchLab local API proxy scaffold — Node.js 18+, no npm dependencies.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
  ".md": "text/markdown"
};

function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const providers = {
  football: { url: "https://v3.football.api-sports.io/status", env: "API_FOOTBALL_KEY" },
  basketball: { url: "https://v1.basketball.api-sports.io/status", env: "API_BASKETBALL_KEY" },
  hockey: { url: "https://v1.hockey.api-sports.io/status", env: "API_HOCKEY_KEY" }
};

async function apiStatus(sport) {
  const provider = providers[sport];
  if (!provider) return { status: 404, body: { ok: false, error: "Deporte no reconocido" } };
  const key = process.env[provider.env];
  if (!key) return { status: 503, body: { ok: false, configured: false, sport, message: `Falta ${provider.env} en .env` } };
  try {
    const response = await fetch(provider.url, {
      headers: { "x-apisports-key": key },
      signal: AbortSignal.timeout(10000)
    });
    const text = await response.text();
    let payload;
    try { payload = JSON.parse(text); } catch { payload = { raw: text.slice(0, 300) }; }
    if (!response.ok) {
      return { status: response.status, body: { ok: false, configured: true, sport, upstreamStatus: response.status, message: "El proveedor rechazó la solicitud; revisa clave, plan y límites." } };
    }
    const hasErrors = payload && payload.errors && Object.keys(payload.errors).length > 0;
    return {
      status: hasErrors ? 502 : 200,
      body: {
        ok: !hasErrors,
        configured: true,
        sport,
        provider: "API-Sports",
        checkedAt: new Date().toISOString(),
        upstream: payload
      }
    };
  } catch (error) {
    return { status: 502, body: { ok: false, configured: true, sport, message: "No se pudo contactar al proveedor.", detail: error.message } };
  }
}

async function footballFixtures(date) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    return { status: 503, body: { ok: false, error: "Falta API_FOOTBALL_KEY en las variables de entorno de Render." } };
  }

  const requestedDate = date || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    return { status: 400, body: { ok: false, error: "La fecha debe tener formato YYYY-MM-DD." } };
  }

  try {
    const endpoint = new URL("https://v3.football.api-sports.io/fixtures");
    endpoint.searchParams.set("date", requestedDate);
    const response = await fetch(endpoint, {
      headers: { "x-apisports-key": key },
      signal: AbortSignal.timeout(15000)
    });
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return { status: 502, body: { ok: false, error: "Respuesta no válida del proveedor." } };
    }

    if (!response.ok) {
      return { status: response.status, body: { ok: false, error: "El proveedor rechazó la consulta.", upstreamStatus: response.status } };
    }
    if (payload.errors && Object.keys(payload.errors).length > 0) {
      return { status: 502, body: { ok: false, error: "API-Sports devolvió errores.", details: payload.errors } };
    }

    const fixtures = (payload.response || []).map(item => ({
      id: item.fixture?.id,
      date: item.fixture?.date,
      status: item.fixture?.status?.short,
      statusLong: item.fixture?.status?.long,
      elapsed: item.fixture?.status?.elapsed,
      league: item.league?.name,
      country: item.league?.country,
      home: item.teams?.home?.name,
      homeLogo: item.teams?.home?.logo,
      homeWinner: item.teams?.home?.winner,
      away: item.teams?.away?.name,
      awayLogo: item.teams?.away?.logo,
      awayWinner: item.teams?.away?.winner,
      goalsHome: item.goals?.home,
      goalsAway: item.goals?.away
    }));

    return {
      status: 200,
      body: {
        ok: true,
        sport: "football",
        date: requestedDate,
        results: fixtures.length,
        paging: payload.paging || null,
        fixtures
      }
    };
  } catch (error) {
    return { status: 502, body: { ok: false, error: "No se pudo contactar con API-Sports.", detail: error.message } };
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/football/fixtures") {
    const result = await footballFixtures(url.searchParams.get("date"));
    res.writeHead(result.status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(JSON.stringify(result.body));
    return;
  }

  if (url.pathname.startsWith("/api/status/")) {
    const sport = url.pathname.split("/").pop();
    const result = await apiStatus(sport);
    res.writeHead(result.status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(JSON.stringify(result.body));
    return;
  }

  if (url.pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, app: "MatchLab", timestamp: new Date().toISOString() }));
    return;
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.resolve(ROOT, "." + pathname);
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== path.join(ROOT, "index.html")) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    });
    res.end(content);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`MatchLab disponible en http://localhost:${PORT}`);
});
