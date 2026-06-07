import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";

const dist = "dist";
const out = ".vercel/output";

if (existsSync(out)) rmSync(out, { recursive: true });

// 1. Static assets → .vercel/output/static
mkdirSync(`${out}/static`, { recursive: true });
cpSync(`${dist}/client`, `${out}/static`, { recursive: true });

// 2. Server function → .vercel/output/functions/index.func
const fnDir = `${out}/functions/index.func`;
mkdirSync(fnDir, { recursive: true });
cpSync(`${dist}/server`, fnDir, { recursive: true });

// Vérifie/crée le .vc-config.json
const vcConfig = `${fnDir}/.vc-config.json`;
if (!existsSync(vcConfig)) {
  writeFileSync(
    vcConfig,
    JSON.stringify(
      {
        runtime: "nodejs24.x",
        handler: "index.mjs",
        launcherType: "Nodejs",
        shouldAddHelpers: true,
      },
      null,
      2,
    ),
  );
}

// 3. Config output Vercel v3
writeFileSync(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "^/assets/(.*)$", dest: "/assets/$1" },
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2,
  ),
);

console.log("✅ .vercel/output structuré avec succès");
