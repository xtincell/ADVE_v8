# Déploiement Coolify — La Fusée v2

Runbook opérateur. Aucun secret ici : les valeurs vivent dans Coolify (UI → app → Environment Variables) ou sur le serveur. Contrat de portabilité §11.1 intact : zéro code Coolify dans l'app — tout ce document est de l'exploitation.

## Topologie

| Élément | Valeur |
|---|---|
| Instance | https://coolify.powerupgraders.com (v4.1.2) |
| Serveur | 76.13.128.23 — une seule machine, deux entrées Coolify : `localhost` (hôte Coolify, entrée canonique) et `smiling-sheep` (IP publique) |
| Projet / env | `lafusee` / `production` |
| Application | `lafusee-v8` — uuid `h6dcy6cil3qc6xv0pbelzqyi` |
| Base | `lafusee-db` (postgres:16-alpine) — uuid `fz2kaykcqvkfvtorvqntyoty`, hostname interne = uuid, réseau docker `coolify` |
| Domaine | https://lafuseev8.powerupgraders.com (wildcard DNS `*.powerupgraders.com` → 76.13.128.23, certificat Let's Encrypt via traefik) |
| Source | GitHub App `average-ant` → repo `xtincell/ADVE_v8`, build pack **Dockerfile**, port 3000, auto-deploy on push activé |

**Branche déployée** : `claude/coolify-ssh-key-setup-j0eqkg` (porte le fix de build c22d638), **temporairement**. Après merge de la PR du fix dans la branche par défaut (`claude/la-fusee-v2-rebuild-9omp5v`), rebasculer : UI → lafusee-v8 → General → Branch, ou :

```bash
curl -X PATCH -H "Authorization: Bearer $COOLIFY_TOKEN" -H "Content-Type: application/json" \
  -d '{"git_branch":"claude/la-fusee-v2-rebuild-9omp5v"}' \
  https://coolify.powerupgraders.com/api/v1/applications/h6dcy6cil3qc6xv0pbelzqyi
```

## Variables d'environnement (runtime uniquement)

`DATABASE_URL` (URL interne Postgres), `NEXTAUTH_SECRET`, `NEXT_PUBLIC_BASE_URL`, `CRON_SECRET`, `SEED_ADMIN_PASSWORD`. Toutes visibles/éditables dans Coolify. Le build n'en a besoin d'aucune : le Dockerfile embarque des placeholders inertes (étage builder seulement).

## Seed (one-off, après le premier déploiement réussi)

Les migrations tournent à chaque boot (entrypoint). Le seed, lui, importe le code applicatif → il se lance depuis l'étage **builder**, sur le serveur. Bloc autonome (lit `DATABASE_URL` et `SEED_ADMIN_PASSWORD` dans le container qui tourne, rien à copier à la main) :

```bash
cd /tmp && rm -rf lafusee-seed \
  && git clone --depth 1 --branch claude/la-fusee-v2-rebuild-9omp5v \
       https://github.com/xtincell/ADVE_v8 lafusee-seed \
  && cd lafusee-seed \
  && docker build --target builder -t lafusee-builder . \
  && APP=$(docker ps --format '{{.Names}}' | grep h6dcy6cil3qc6xv0pbelzqyi | head -1) \
  && docker run --rm --network coolify \
       -e NODE_ENV=production \
       -e DATABASE_URL="$(docker exec "$APP" printenv DATABASE_URL)" \
       -e SEED_ADMIN_PASSWORD="$(docker exec "$APP" printenv SEED_ADMIN_PASSWORD)" \
       lafusee-builder npm run db:seed \
  && docker image rm lafusee-builder && cd / && rm -rf /tmp/lafusee-seed
```

Le seed est idempotent (relançable sans risque). Sans lui, `/` et `/tarifs` répondent 500 à dessein (« Opérateur par défaut absent ») — le tenant opérateur est un invariant structurel, pas un état vide. Si le réseau docker diffère : `docker network ls | grep coolify`. Compte admin seedé : email god-mode + mot de passe `SEED_ADMIN_PASSWORD` (visible dans Coolify → Environment Variables).

## Crons (4 tâches planifiées Coolify, dans le container de l'app)

| Tâche | Fréquence | Endpoint |
|---|---|---|
| cron-digest | `0 8 * * 1` | /api/cron/digest |
| cron-subscriptions | `0 3 * * *` | /api/cron/subscriptions |
| cron-signals | `0 6 * * *` | /api/cron/signals |
| cron-statements | `0 4 1 * *` | /api/cron/statements |

Commande type : `sh -c 'wget -qO- --header "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/<job>'` — `$CRON_SECRET` est résolu dans l'env du container. Vérifier la première exécution dans Coolify → lafusee-v8 → Scheduled Tasks → Executions (un échec d'auth renverrait 401 fail-closed).

## Clé SSH de gestion (rotation 2026-07-06)

- Paire ed25519, commentaire `coolify`, empreinte `SHA256:6YoTNSa/LY41BbIG2XKjpS8MOOH1SnlcTXhYc6AUKEA`.
- Publique : `/root/.ssh/authorized_keys` du serveur. Privée : Coolify → Keys & Tokens (« localhost's key », utilisée par les DEUX entrées serveur).
- Rotation : générer une paire (`ssh-keygen -t ed25519 -C coolify`), ajouter la publique dans `authorized_keys`, coller la privée dans Coolify, l'assigner aux deux serveurs, « Validate », puis retirer l'ancienne publique d'`authorized_keys`.

## Incident 2026-07-01 → 2026-07-06 (référence dépannage)

Symptômes : serveurs `is_reachable:False`, revalidations sans effet **et sans logs**, toutes les ressources figées `exited:unhealthy` alors que les sites servaient normalement. Cause racine : reboot serveur du 1er juillet → la file de jobs interne du control plane (Horizon) ne traitait plus rien ; « Validation started. » était accepté mais jamais exécuté (`is_validating` jamais posé). S'y ajoutait une clé SSH à remplacer.

Remède (dans l'ordre) :

```bash
# sur le serveur — ne touche NI aux apps NI au proxy public
docker restart coolify-redis coolify-realtime coolify
# ~30 s après :
docker exec coolify php artisan horizon:status   # attendu : « Horizon is running. »
```

puis re-valider les serveurs (UI ou `GET /api/v1/servers/<uuid>/validate`). Règle de diagnostic : **une validation qui ne laisse aucune trace = file morte ; une validation qui échoue avec des logs = problème SSH/clé.**
