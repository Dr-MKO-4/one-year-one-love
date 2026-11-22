# One Year, One Love

Site privé du premier anniversaire de Miguel et Adèle, avec le module **Our Love Games** (six jeux), une frise, une lettre et une playlist écoutée ensemble en temps réel.

- **Front :** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, React Router, Lucide
- **Back :** Express, Prisma, PostgreSQL, socket.io (temps réel)
- **Déploiement :** une seule image Docker (API, temps réel et front compilé) sur Railway

## Démarrage local

Prérequis : Node.js 20 ou plus, et Docker Desktop (ou un PostgreSQL déjà installé).

```powershell
.\start-local.ps1            # Windows : base Docker + migrations + contenus + serveurs de dev
.\start-local.ps1 -SkipDb    # avec ton propre PostgreSQL (DATABASE_URL dans .env)
.\start-local.ps1 -Prod      # teste l'image de production sur http://localhost:8080
```

```bash
./start-local.sh             # macOS / Linux / Git Bash (mêmes options : --skip-db, --prod)
```

Le script crée `.env` à partir de `.env.example`, démarre PostgreSQL (port 5433), applique les migrations, ajoute les contenus initiaux et lance :

- le site sur http://localhost:5173 (accessible depuis un téléphone du même Wi-Fi via l'IP du PC)
- l'API sur http://localhost:4000

**Codes PIN par défaut** : Miguel `2203`, Adèle `1604`. Change-les dans `.env` (`MIGUEL_PIN`, `ADELE_PIN`), ainsi que `JWT_SECRET`.

**Musique en local** : les fichiers audio du dossier `music/` forment la playlist (mp3, m4a, aac, ogg, opus, wav, flac). Le dossier n'est pas versionné dans git.

### Commandes utiles

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur et client en mode développement |
| `npm run build` | Compile le client (Vite) et le serveur (esbuild) |
| `npm test` | Tests des moteurs de jeux et des scores |
| `npm run typecheck` | Vérification TypeScript (client + serveur) |
| `npm run db:migrate` | Nouvelle migration Prisma (développement) |
| `npm run db:seed` | Contenus initiaux (seulement les catégories vides) |
| `npm run db:studio` | Interface Prisma Studio |

## Déploiement sur Railway

1. **Créer le projet** depuis le dépôt GitHub : Railway détecte `railway.json` et construit le `Dockerfile`.
2. **Ajouter PostgreSQL** (bouton *New → Database → PostgreSQL*).
3. **Variables du service web** :

   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (référence au service PostgreSQL) |
   | `JWT_SECRET` | chaîne aléatoire d'au moins 24 caractères |
   | `MIGUEL_PIN` | code de Miguel |
   | `ADELE_PIN` | code d'Adèle |
   | `MUSIC_DIR` | `/music` (déjà la valeur par défaut de l'image) |
   | `RAILWAY_RUN_UID` | `0` (nécessaire pour écrire sur le volume, monté en root par Railway) |

4. **Ajouter un volume** au service web, monté sur **`/music`**. C'est là que vivent les fichiers audio.
5. **Générer un domaine** (*Settings → Networking*). Le contrôle de santé utilise `/api/health`.
6. **Envoyer la musique** : une fois connecté, *Configuration → Musique → Ajouter des titres*. Les fichiers sont écrits sur le volume et la playlist se met à jour chez vous deux.

Au démarrage, le conteneur applique les migrations (`prisma migrate deploy`), ajoute les contenus initiaux si la base est vide, puis lit le dossier musique.

> Garder **une seule instance** (`numReplicas: 1`) : l'état temps réel (parties, musique partagée) vit dans la mémoire du serveur.

## Fonctionnement

### Accès privé
Deux codes PIN, un par personne : le site sait qui joue sur quel téléphone. Site non indexé (`noindex`, `robots.txt`), API et fichiers protégés par cookie de session.

### Les six jeux
| Jeu | Mode | Difficulté | Score |
|---|---|---|---|
| Who Knows Who? | Chacun son tour | Progressive | Personnel + commun |
| Tu préfères quoi ? | Simultané | Accessible | Participation + compatibilité |
| Memory of Us | Duo ou solo | Progressive (niveaux) | Personnel + commun |
| Do You Remember? | Chacun son tour | Intermédiaire à difficile (chrono) | Personnel + commun |
| Love Challenges | Individuel et à deux | Accessible à intermédiaire | Personnel + commun |
| Complete My Sentence | Simultané | Intermédiaire | Personnel + commun |

- **Deux téléphones** : chacun joue sur le sien, l'état est diffusé en temps réel. Le serveur masque les réponses secrètes de l'autre jusqu'à la révélation.
- **Un seul téléphone** : écran « Passe le téléphone à… » pour garder les réponses secrètes.
- **Réponses de référence enregistrées en jeu** : si une réponse n'existe pas encore, la personne concernée l'écrit en secret pendant la partie et elle est conservée pour les suivantes.
- Tous les résultats sont normalisés sur 100. Les parties interrompues ne comptent pas dans les moyennes. On peut toujours passer une question ou un défi.

### Musique partagée
Le serveur détient l'état de lecture (titre, lecture ou pause, position). Quand l'un zappe, met en pause, avance ou choisit un titre, le téléphone de l'autre suit à l'instant et se recale automatiquement en cas de dérive. Le volume et la sourdine restent propres à chaque téléphone. Quand plus personne n'est connecté, la musique se met en pause et reprend au même endroit.

Les navigateurs mobiles exigent un toucher avant de lancer du son : si la musique tourne déjà chez l'autre, le lecteur affiche « Rejoindre l'écoute ».

### Configuration
*Configuration* permet de modifier sans code : questions et réponses de référence, dilemmes, associations Memory (avec photos), défis, phrases et mots-clés, photos, frise, lettre d'accueil, playlist. *Sauvegarde* exporte ou importe tout en JSON.

## Structure

```
client/   React (pages, jeux, composants, services)
server/   Express (routes, moteurs de jeux, temps réel, musique, Prisma)
shared/   Types, comparaison de textes et règles de score communs
music/    Fichiers audio locaux (non versionnés)
```
