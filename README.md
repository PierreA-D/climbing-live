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

Important: le serveur est maintenant protégé par le backend d'autorisation.
Avant d'envoyer un flux, créez un appareil autorisé via l'API backend.

Exemple de création d'un appareil :

```bash
curl -X POST http://localhost:3000/api/backend/devices \
  -H "Content-Type: application/json" \
  -d '{
    "id": "phone-main",
    "name": "iPhone Regie",
    "authorized": true,
    "allowedPaths": ["main"]
  }'
```

La réponse contient `token` (à conserver). Ensuite configurez l'app de streaming avec:

- Username: `phone-main`
- Password: `<token_retourne_par_l_api>`
- URL RTMP: `rtmp://<IP-PC>:1935/main`

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
- Utilisateur : `id de l'appareil` (ex: `phone-main`)
- Mot de passe : `token de l'appareil`

---

## API backend

### Lecture frontend

La route `GET /api/cameras` interroge MediaMTX et retourne les flux actifs :

```json
[
  { "id": "main",  "name": "main",  "url": "http://localhost:8888/main/index.m3u8" },
  { "id": "bloc1", "name": "bloc1", "url": "http://localhost:8888/bloc1/index.m3u8" }
]
```

Seuls les flux **en cours de diffusion** (`ready: true`) apparaissent.

### Gestion des appareils

Routes disponibles :

- `GET /api/backend/devices` : liste des appareils
- `POST /api/backend/devices` : créer un appareil
- `GET /api/backend/devices/connected` : appareils considérés connectés (online)
- `GET /api/backend/devices/:id` : détail d'un appareil
- `PATCH /api/backend/devices/:id` : modifier un appareil
- `DELETE /api/backend/devices/:id` : supprimer un appareil

Payload de création d'appareil (exemple) :

```json
{
  "id": "phone-main",
  "name": "iPhone Regie",
  "authorized": true,
  "allowedPaths": ["main", "bloc1"],
  "notes": "Appareil principal"
}
```

### Gestion des streams

- `GET /api/backend/streams` : liste des flux MediaMTX + statut d'autorisation

### Settings backend

- `GET /api/backend/settings` : récupérer les settings actifs
- `PUT /api/backend/settings` : mettre à jour les settings
- `GET /api/backend/settings/schema` : description de tous les settings disponibles + valeurs par défaut

Exemple de mise à jour des settings :

```json
{
  "requireDeviceAuth": true,
  "allowUnknownDevices": false,
  "autoRegisterUnknownDevices": false,
  "autoAuthorizeNewDevices": false,
  "exposeOnlyAuthorizedPaths": true,
  "maxConnectedDevices": 8,
  "deviceOfflineAfterMs": 60000,
  "pollIntervalMs": 10000,
  "enablePublish": true,
  "enableRead": true
}
```

### Endpoints d'intégration MediaMTX

- `POST /api/internal/mediamtx/auth` : autoriser/refuser une connexion stream (publish/read)
- `POST /api/internal/mediamtx/events` : mettre à jour l'état online/offline des appareils

Ces endpoints servent de backend de contrôle pour MediaMTX (autorisation des appareils et suivi des connexions).

### Activation de l'auth MediaMTX

`docker-compose.yml` est configuré pour appeler `POST /api/internal/mediamtx/auth`.
Après mise à jour, redémarrer MediaMTX:

```bash
docker compose down
docker compose up -d
```

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
  │   ├── backend/
  │   │   ├── devices/
  │   │   ├── settings/
  │   │   └── streams/
  │   └── cameras/
  │       └── route.ts
  │   └── internal/
  │       └── mediamtx/
  ├── components/
  │   └── MultiCamPlayer.tsx
  ├── globals.css
  ├── layout.tsx
  └── page.tsx
lib/
  └── backend/
docker-compose.yml
```

## Fonctionnalités

- Lecture live HLS avec Video.js
- Détection automatique des flux actifs (polling toutes les 10s)
- Switch de caméra sans interruption
- Interface responsive (mobile-first)
- Message si aucun flux actif
- Compatible TV
- Backend de gestion des appareils (autoriser/bloquer)
- Inventaire des appareils connectés
- Settings backend pour contrôle fin des flux

## Reduction de latence (future)

- Actuel: HLS (environ 3 a 10 secondes)
- Plus tard: WebRTC ou LL-HLS

## Notes techniques

- @videojs-player/react n'a pas ete ajoute: sa version actuelle est incompatible avec React 19.
- Le player est integre directement via video.js dans app/components/MultiCamPlayer.tsx.
- Next.js 16 demande Node.js >= 20.9.0 pour executer l'application.
