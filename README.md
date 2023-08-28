# Pocket Particles
A simple particle manager for JavaScript that enables efficient positional queries by dynamically grouping particles into recursively smaller sub pockets.

> *This is the successor to a previously known packaage: `@midpoint68/pocket`*

## Installation

```bash
npm i pocket-particles
```

```typescript
import { Pocket, Particle } from "pocket-particles";
```

## Creating a Pocket

```javascript
var pocket = new Pocket();
```

## Adding Particles to a Pocket

```javascript
// Add 1000 particles with random locations within the bounds (0, 0, 0) and (100, 100, 100)
for(let i = 0; i < 1000; i++){
  pocket.put(new Particle({
    data: 'Particle #'+i,
    x: Math.random()*100,
    y: Math.random()*100,
    z: Math.random()*100,
    radius: 0.5
  }));
}
```

## Searching for Particles

```javascript
// Get a Set of all particles within a 10 unit radius of the point (50, 50, 50)
const particles = pocket.search(10, {x: 50, y: 50, z: 50});
```

## Getting the Closest Particle

```javascript
// Get only the closest particle to the point (50, 50, 50)
const closest = pocket.closest({x: 50, y: 50, z: 50});
```

## Moving a Particle

```javascript
// Get the closest particle to (50, 50, 50) and move it to (0, 0, 0)
const closest = pocket.closest({x: 50, y: 50, z: 50});
closest.moveTo({x: 0, y: 0, z: 0});

// You can also edit individual components of the particle. Keep in mind when editing more than one dimension of the particle's position, it is more effecient to use `Particle.moveTo(...)`.
closest.x = 0;
closest.y = 0;
closest.z = 0;
```

## Updating a particle's radius

```javascript
// You can directly update the particle's radius via the `radius` setter.
particle.radius = 10;
```