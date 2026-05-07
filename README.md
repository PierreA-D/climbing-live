# Climbing Live — Plateforme de retransmission multi-cameras

## Stack

### Frontend

- Next.js 16 (App Router, Turbopack)
- TypeScript
- TailwindCSS v4
- Video.js (lecteur HLS)

### Video

- MediaMTX (ingest RTMP/RTSP/SRT → HLS)

## Architecture

```text
Smartphones / Cameras
        |
  RTMP / RTSP / SRT
        |
     MediaMTX  (:8554 RTSP, :1935 RTMP, :8888 HLS, :9997 API)
        |
       HLS
        |
  Next.js API Route  (/api/cameras)
        |
  Video.js Player
```

## Prérequis

- Node.js >= 20.9.0 (utiliser [nvm](https://github.com/nvm-sh/nvm))
- Docker + Docker Compose

---

## Installation

### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd climbing-live
```

### 2. Installer Node.js 20 (si besoin)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

### 3. Installer les dépendances

```bash
npm install
```

### 4. Démarrer MediaMTX

```bash
docker compose up -d
```

### 5. Démarrer le serveur de développement

```bash
npm run dev
```

Ouvrir ensuite **http://localhost:3000** (PC) ou **http://\<IP-LAN\>:3000** (mobile sur le même réseau).

---

## Envoi d'un flux vidéo

### Depuis un smartphone

Application recommandée : **Larix Broadcaster** (iOS/Android)

| Protocole | URL de destination |
|-----------|-------------------|
| RTMP | `rtmp://<IP-PC>:1935/<nom-camera>` |
| RTSP | `rtsp://<IP-PC>:8554/<nom-camera>` |
| SRT | `srt://<IP-PC>:8890?streamid=publish:<nom-camera>` |

Exemples :

```
rtmp://192.168.1.10:1935/main
rtmp://192.168.1.10:1935/bloc1
rtmp://192.168.1.10:1935/bloc2
```

### Depuis OBS Studio

Dans **Paramètres → Flux** :
- Type : `Streaming personnalisé`
- Serveur : `rtmp://<IP-PC>:1935/`
- Clé de stream : `main` (ou le nom souhaité)

---

## API backend

La route `GET /api/cameras` interroge MediaMTX et retourne les flux actifs :

```json
[
  { "id": "main",  "name": "main",  "url": "http://localhost:8888/main/index.m3u8" },
  { "id": "bloc1", "name": "bloc1", "url": "http://localhost:8888/bloc1/index.m3u8" }
]
```

Seuls les flux **en cours de diffusion** (`ready: true`) apparaissent. La liste se rafraîchit toutes les 10 secondes dans le player.

### Variables d'environnement

Créer un fichier `.env.local` à la racine pour personnaliser les URLs :

```env
MEDIAMTX_API_URL=http://localhost:9997
HLS_BASE_URL=http://localhost:8888
```

---

## Ports exposés par MediaMTX

| Port | Protocole | Usage |
|------|-----------|-------|
| 1935 | RTMP | Ingest depuis OBS / Larix |
| 8554 | RTSP | Ingest / lecture RTSP |
| 8888 | HTTP | Lecture HLS |
| 8889 | WebRTC | Lecture WebRTC |
| 9997 | HTTP | API de gestion MediaMTX |

---

## Structure du projet

```text
app/
  ├── api/
  │   └── cameras/
  │       └── route.ts        # Route API → liste des flux actifs
  ├── components/
  │   └── MultiCamPlayer.tsx  # Lecteur multi-caméras
  ├── globals.css
  ├── layout.tsx
  └── page.tsx
docker-compose.yml
```

## Fonctionnalités

- Lecture live HLS avec Video.js
- Détection automatique des flux actifs (polling toutes les 10s)
- Switch de caméra sans interruption
- Interface responsive (mobile-first)
- Message si aucun flux actif
- Compatible TV

## Evolutions recommandees

- Scores live
- Overlay grimpeur
- Replay automatique
- Multi-view
- Clips automatiques
- IA tracking

## Reduction de latence (future)

- Actuel: HLS (environ 3 a 10 secondes)
- Plus tard: WebRTC ou LL-HLS

## Prochaine etape backend

Ajouter un backend Symfony pour:

- gestion competition
- scores live
- grimpeurs
- planning
- classement temps reel
- authentification

## Notes techniques

- @videojs-player/react n'a pas ete ajoute: sa version actuelle est incompatible avec React 19.
- Le player est integre directement via video.js dans app/components/MultiCamPlayer.tsx.
- Next.js 16 demande Node.js >= 20.9.0 pour executer l'application.
