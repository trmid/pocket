# Pocket
An efficient and scalable method of managing particle systems.

## Creating a Pocket

```javascript
var pocket = new Pocket();
```

## Adding Particles to the Pocket

```javascript
// Add 1000 particles with random locations within the bounds (0, 0, 0) and (1, 1, 1)
for(let i = 0; i < 1000; i++){
  pocket.put('particle #'+i, Math.random(), Math.random(), Math.random());
}
```

## Searching and Area for Particles

```javascript
// Get all particles within a 10 unit radius of the point (50, 50, 50)
const nearby = pocket.search(10, 50, 50, 50);
```

## Getting the Closest Particle

```javascript
// Get only the closest particle to the point (50, 50, 50)
const closest = pocket.closest(50, 50, 50);
```

## Moving a Particle

```javascript
// When you put a particle into a Pocket, the call returns a function to retrieve the same particle. We can use this to move particles efficiently without creating a new pocket.

// Create a Pocket
const pocket = new Pocket();

// Create an array to store particle retrieval functions
const retrieve = new Array();

// Create 1000 random particles and store each retrieval function in our array
for(let i = 0; i < 1000; i++){
  retrieve[i] = pocket.put('Particle #'+i, Math.random(), Math.random(), Math.random());
}

// Add a random vector to each particle
for(let i = 0; i < 1000; i++){
  const particle = retrieve[i]();
  
}
```
