// pm2 (cahier §11.1) — sert l'artefact standalone construit par `npm run build:standalone`.
// IMPORTANT : instances = 1. Le broker SSE de notifications vit en mémoire du
// processus (contrat mono-instance documenté §7) — passer en cluster couperait
// le temps réel. L'interface du broker est remplaçable (Redis pub/sub) le jour
// où le multi-pod devient nécessaire.
module.exports = {
  apps: [
    {
      name: "la-fusee",
      script: ".next/standalone/server.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
