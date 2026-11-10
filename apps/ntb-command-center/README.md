# NTB Smart Heritage Command Center

Standalone Next.js App Router dashboard for the Nepal Tourism Board (NTB) and MoCTCA heritage operations.

## Routes

| Path | Section |
| --- | --- |
| `/` | Command overview |
| `/foot-traffic` | Tourist foot-traffic dispersion monitor |
| `/registry` | Digital heritage registry & embedding health matrix |
| `/livelihoods` | Local guide economic impact tracker |
| `/alerts` | Crisis preparedness & geofenced alert console |
| `/sandbox` | Live interactive vector pitch sandbox |

## Data

Demo metrics are seeded from `data/nepal_heritage_seed` (all 8 zones, 101 monuments) into `src/data/dashboard.json`.

## Scripts

```bash
npm install --no-audit --yes
npm run build
npm run dev
```
