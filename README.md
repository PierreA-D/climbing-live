# MVP - Plateforme de retransmission multi-cameras (escalade)

## Stack

### Frontend

- Next.js
- TypeScript
- TailwindCSS
- Video.js

### Backend

- Symfony API
- Mercure ou WebSocket

### Video

- MediaMTX
- HLS

## Architecture

```text
Smartphones/Cameras
	 |
 RTMP / SRT
	 |
    MediaMTX
	 |
      HLS
	 |
 Next.js + Video.js
	 ^
 Symfony API
```

## Structure

```text
app/
 |- page.tsx
 |- components/
 |   |- MultiCamPlayer.tsx
docker-compose.yml
```

## Installation frontend

```bash
npm install
```

## Lancement frontend

```bash
npm run dev
```

Ouvrir ensuite http://localhost:3000.

## Configuration MediaMTX

Le fichier docker-compose est deja present a la racine.

```bash
docker compose up -d
```

## Envoi de flux depuis smartphone

Application recommandee: Larix Broadcaster

Exemple de destination RTMP:

```text
rtmp://IP_SERVEUR:1935/main
```

Exemple bloc:

```text
rtmp://192.168.1.10:1935/bloc1
```

## Lecture HLS

MediaMTX genere automatiquement des playlists HLS:

```text
http://IP_SERVEUR:8888/main/index.m3u8
```

## Fonctionnalites MVP incluses

- Live video
- Switch camera
- Interface responsive
- Flux HLS
- Compatible mobile
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
