import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const isRailwayProd = Boolean(process.env.RAILWAY_ENVIRONMENT) && process.env.NODE_ENV === "production";
const allowFullPush = process.env.ALLOW_FULL_DB_PUSH === "1";

if (isRailwayProd && !allowFullPush) {
  console.log("[db:push] Skipping full schema push on Railway production startup.");
  console.log("[db:push] Use manual safe migrations or set ALLOW_FULL_DB_PUSH=1 for an intentional one-off push.");
  process.exit(0);
}

const child = spawn("npx", ["drizzle-kit", "push", ...args], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
