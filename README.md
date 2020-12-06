# Pocket
An efficient and scalable method of managing particle systems.

## Creating a Pocket

```javascript
var pocket = new Pocket();
```

## Adding Particles to a Pocket

```javascript
// Add 1000 particles with random locations within the bounds (0, 0, 0) and (100, 100, 100)
for(let i = 0; i < 1000; i++){
  pocket.put({
    data: 'Particle #'+i,
    x: Math.random()*100,
    y: Math.random()*100,
    z: Math.random()*100,
    radius: 0.5
  });
}
```

## Searching for Particles

```javascript
// Get all particles within a 1 unit radius of the point (50, 50, 50)
const particles = pocket.search(1, {x: 50, y: 50, z: 50});
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
```
