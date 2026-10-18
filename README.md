# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Demo:

[Asteroids demo](https://klerith.github.io/claude-asteroids/)

## Descripción del juego

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye power-ups especiales y tipos de asteroides únicos como la estrella fugaz...

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción     |
| --------- | ---------- |
| `←` `→`   | Rotar nave |
| `↑`       | Propulsar  |
| `Espacio` | Disparar   |
| `B`       | Detonar Bomba Nova |

## Puntuación

| Asteroide | Puntos |
| --------- | ------ |
| Grande    | 20     |
| Mediano   | 50     |
| Pequeño   | 100    |

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- Power-up **Disparo Triple**: algunos asteroides sueltan un orbe celeste; al recogerlo la nave dispara 3 balas en abanico durante 10 segundos (recoger otro suma 10 s más); el efecto se pierde al morir o al pasar de nivel
- Power-up **Escudo Temporal**: orbe verde que rodea la nave con un círculo de energía durante 5 segundos; absorbe un impacto de asteroide al tocar el círculo (el asteroide se destruye y suma puntos) y luego desaparece; también se pierde al morir o al pasar de nivel
- Power-up **Bomba Nova**: orbe rosa muy escaso; al recogerlo queda guardado (máximo uno, se indica en el HUD) y al pulsar `B` destruye todos los asteroides en pantalla, sin fragmentos y sumando sus puntos; es de un solo uso y se pierde al morir o al pasar de nivel
