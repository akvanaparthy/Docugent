// scripts/update-vercel-ngrok.js
const https = require("https");
const http = require("http");
const { execSync } = require("child_process");

const VERCEL_TOKEN = process.env.VERCEL_TOKEN; // create a Vercel token
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID; // project id or name
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || undefined; // optional

// Configurable ngrok local API address and optional tunnel name
// Default ngrok local API is 127.0.0.1:4040
const NGROK_API_ADDR = process.env.NGROK_API_ADDR || "127.0.0.1:4040";
const NGROK_TUNNEL_NAME = process.env.NGROK_TUNNEL_NAME || undefined;

function getNgrokUrl() {
  return new Promise((resolve, reject) => {
    const apiUrl = `http://${NGROK_API_ADDR}/api/tunnels`;
    http
      .get(apiUrl, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            let t;
            if (Array.isArray(json.tunnels)) {
              const tunnels = json.tunnels.filter(
                (x) => x.public_url && x.proto === "https"
              );
              if (NGROK_TUNNEL_NAME) {
                t = tunnels.find((x) => x.name === NGROK_TUNNEL_NAME);
              }
              if (!t) t = tunnels[0];
            }
            if (!t) return reject(new Error("No https tunnel found"));
            resolve(t.public_url);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function vercelRequest(path, method = "GET", body) {
  const query = VERCEL_TEAM_ID
    ? `?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}`
    : "";
  const payload = body ? JSON.stringify(body) : undefined;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.vercel.com",
        path: `${path}${query}`,
        method,
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
          "Content-Length": payload ? Buffer.byteLength(payload) : 0,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            return reject(new Error(`Vercel API ${res.statusCode}: ${data}`));
          }
          resolve(data ? JSON.parse(data) : {});
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    console.error("Missing VERCEL_TOKEN or VERCEL_PROJECT_ID");
    process.exit(1);
  }

  const ngrokUrl = await getNgrokUrl();
  const lmBase = `${ngrokUrl}/v1`;
  console.log("ngrok URL:", ngrokUrl);
  console.log("Setting LM_BASE_URL:", lmBase);

  // 1) List env vars
  const envs = await vercelRequest(
    `/v10/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/env`
  );
  const existing =
    envs && envs.envs ? envs.envs.filter((e) => e.key === "LM_BASE_URL") : [];

  // 2) Delete existing LM_BASE_URL entries (all targets)
  for (const e of existing) {
    await vercelRequest(
      `/v10/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/env/${e.id}`,
      "DELETE"
    );
  }

  // 3) Create new env for all targets (adjust targets if you only want 'production')
  await vercelRequest(
    `/v10/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/env`,
    "POST",
    {
      key: "LM_BASE_URL",
      value: lmBase,
      target: ["production", "preview", "development"],
      type: "plain",
    }
  );

  console.log("Updated LM_BASE_URL on Vercel");

  // 4) Redeploy latest production deployment to apply env
  // Requires vercel CLI installed and logged in: npm i -g vercel
  execSync("vercel redeploy --prod --yes", { stdio: "inherit" });
  console.log("Triggered redeploy");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
