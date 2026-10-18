# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Asteroids clone in pure HTML5 Canvas + vanilla ES6 JavaScript. No frameworks, bundler, dependencies, package.json, build step, linter, or tests. All game logic lives in `game.js`; `index.html` only hosts an 800×600 `<canvas id="canvas">` and loads the script.

User-facing text (HUD, overlays, README) and code comments are in **Spanish** — keep new strings and comments in Spanish to match.

## Running

Open `index.html` directly in a browser, or serve the folder:

```bash
npx serve .   # then visit http://localhost:3000
```

There is nothing to build or test; verify changes by playing the game in the browser.

## Architecture (`game.js`)

The file is organized top-to-bottom in sections marked by `// ── Name ───` banners: Input → Utils → entity classes → game state → `update` → `draw` → main loop.

- **Main loop**: `requestAnimationFrame(loop)` computes `dt` in seconds (clamped to 0.05) and calls `update(dt)` then `draw()`. All motion is frame-rate independent — multiply velocities/timers by `dt`.
- **Globals**: `canvas`, `ctx`, `W`, `H` are module-level and used directly by every class's `draw()`. Game state (`ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`, `state`, `deadTimer`) is also global, reset by `initGame()` / `nextLevel()`.
- **Entity convention**: each entity (`Bullet`, `Asteroid`, `Ship`, `Particle`) exposes `update(dt)`, `draw()`, and a `dead` flag. Removal is done by setting `dead = true` and filtering arrays afterwards — don't splice during iteration.
- **Toroidal space**: positions are wrapped with `wrap(v, max)`. Particles intentionally don't wrap.
- **State machine**: `state` is `'playing' | 'dead' | 'gameover'`. `update()` branches on it at the top; `'dead'` runs a respawn timer while asteroids/particles keep moving, `'gameover'` waits for Space to call `initGame()`.
- **Input**: `keys[code]` holds held keys (used for rotation/thrust); `pressed(code)` is a one-shot edge trigger that consumes `justPressed[code]` (used for shooting and restart). Arrow keys and Space have `preventDefault()` applied.
- **Asteroid sizes**: size 3 (large) → 2 → 1 (small). Per-size tables `RADII`, `SPEEDS`, `POINTS` are indexed by size (index 0 unused). `split()` returns two children of `size - 1`.
- **Collisions**: simple circle distance via `dist()`. Ship hitbox uses `a.radius * 0.82` for leniency and is skipped while `ship.invincible > 0` (3 s after spawn, shown as blinking).
- **Levels**: clearing all asteroids calls `nextLevel()`, which spawns `3 + level` large asteroids at least `SAFE_DIST` from the center.

## Note

The README mentions power-ups and special asteroid types (e.g. "estrella fugaz"), but these are **not implemented** in `game.js` yet.
