# Vice Coast ’86

An original Vice City–inspired 3D driving and exploration game. Cruise the streets on foot or in a car, explore five coastal districts, or complete the three story jobs: **The Sunset Drop**, **Ocean Sprint**, and **After Hours**. Progress and best times save locally when the browser permits it. The city, cars, missions, and synthesized soundtrack are original. No commercial game files are included.

Download and extract **Vice Coast - Offline Game.zip**, then open **Play Vice Coast.html** in a browser. The HTML is fully self-contained. See `START HERE.txt` for controls. If WebGL is unavailable, the same missions and driving simulation run in a 2D overhead view.

For local development (Node 20.19+ or 22.12+, pnpm):

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
```

`pnpm dev` serves `http://127.0.0.1:5173/`. `pnpm build` creates the standalone package HTML under `deliverables/` and a regular static site in `dist/`. The `dist/` directory contains only Vice Coast files. All paths are relative for hosting under a subdirectory.

| Controls | Action |
| --- | --- |
| WASD / arrows | Move, accelerate, reverse, steer |
| E | Enter or exit a car |
| Space | Handbrake or jump |
| Shift | Run on foot |
| Drag | Look around |
| M / Esc | Map / pause |

The former Vestano project is recoverable from Git revision `a639c7d`. Old working files and local exports are in the ignored `.archive/vestano-a639c7d/` folder. The game is not deployed to the public Vestano site.
