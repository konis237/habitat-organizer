// scripts/vercel-postbuild.mjs
// Restructure dist/ → .vercel/output/ après un build Nitro preset:vercel
import { cpSync, mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";

const dist = "dist";
const out = ".vercel/output";

// Nettoie l'output précédent
if (existsSync(out)) rmSync(out, { recursive: true });

// 1. Fichiers statiques client → .vercel/output/static
mkdirSync(`${out}/static`, { recursive: true });
cpSync(`${dist}/client`, `${out}/static`, { recursive: true });

// 2. Fonction serverless → .vercel/output/functions/index.func
const fnDir = `${out}/functions/index.func`;
mkdirSync(fnDir, { recursive: true });
cpSync(`${dist}/server`, fnDir, { recursive: true });

// Le .vc-config.json est déjà dans dist/server, on s'assure qu'il est bien là
// Sinon on le crée
const vcConfig = join(fnDir, ".vc-config.json");
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

// 3. Config Vercel output
writeFileSync(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Assets statiques servis directement
        {
          src: "^/assets/(.*)$",
          dest: "/assets/$1",
        },
        // Tout le reste → fonction SSR
        {
          src: "/(.*)",
          dest: "/index",
        },
      ],
    },
    null,
    2,
  ),
);

console.log("✅ .vercel/output restructuré avec succès");
