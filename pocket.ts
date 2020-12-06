
interface Vector {
    x: number
    y: number
    z: number
}

interface Particle<T> extends Vector {
    obj: T
    radius: number
}

class SubPocket<T> {

    radius: number
    parent: SubPocket<T> | Pocket<T>
    pockets: SubPocket<T>[]
    particles: Particle<T>[]
    position: Vector

    constructor({
        parent,
        radius,
        position
    }: {
        parent: SubPocket<T> | Pocket<T>
        radius: number,
        position: Vector
    }) {
        this.parent = parent;
        this.radius = radius;
        this.pockets = new Array<SubPocket<T>>();
        this.particles = new Array<Particle<T>>();
        this.position = position;
    }

    /**
     * Places the object in this pocket or in a sub pocket of this pocket and returns a function to call to retrieve the object from the pocket. (Call to pull the object out of the pocket if being moved)
     * 
     * @param obj The object to store
     * @param radius The radial influence of the object
     * @param x The x position of the object
     * @param y The y position of the object
     * @param z The z position of the object
     */
    put(
        obj: T,
        x: number,
        y: number,
        z = 0,
        radius = 0
    ): (() => T) | undefined {
        const diff = Pocket.Tools.sub(this.position, { x: x, y: y, z: z });
        const dist = Pocket.Tools.mag(diff);
        if (dist + radius < this.radius) {
            if (radius >= this.radius / Pocket.Tools.MAGIC_RATIO) {

                // Add object to the pocket
                this.particles.push({
                    obj: obj,
                    radius: radius,
                    x: x,
                    y: y,
                    z: z
                });

                // Return retrieval function
                const self = this;
                return () => {
                    return self.retrieve(obj);
                };

            } else {

                // Add object to a SubPocket
                for (let i = 0; i < this.pockets.length; i++) {
                    const result = this.pockets[i].put(obj, x, y, z, radius);
                    if (result) return result;
                }

                // Doesn't fit in any SubPockets so we will create a new one with half the radius of this one, centered at the object's position
                const sp = new SubPocket<T>({
                    parent: this,
                    radius: this.radius / Pocket.Tools.MAGIC_RATIO,
                    position: {
                        x: x,
                        y: y,
                        z: z
                    }
                });
                this.pockets.push(sp);
                return sp.put(obj, x, y, z, radius);

            }
        } else {
            return undefined;
        }
    }

    /**
     * Retrieves an object from this pocket if it is stored here and removes it from the pocket. The call will always return the object regardless if it exists in the pocket or not.
     * 
     * @param obj The object to retrieve from this pocket
     */
    retrieve(obj: T) {
        this.particles = this.particles.filter(p => p.obj != obj);
        if (this.pockets.length == 0 && this.particles.length == 0) {
            this.parent.remove(this);
        }
        return obj;
    }

    /**
     * Removes a SubPocket from this pocket.
     * 
     * @param sp The SubPocket to be removed
     */
    remove(sp: SubPocket<T>) {
        this.pockets = this.pockets.filter(p => p != sp);
        if (this.pockets.length == 0 && this.particles.length == 0) {
            this.parent.remove(this);
        }
    }

    /**
     * Returns an array of all objects that exist wholly or partially within the given radius of the desired coordinates.
     * 
     * @param radius The radius of the search
     * @param x The x position of the center of the search
     * @param y The y position of the center of the search
     * @param z The z position of the center of the search
     */
    search(radius: number, x: number, y: number, z = 0) {
        var found = new Array<Particle<T>>();
        const diff = Pocket.Tools.sub(this.position, { x: x, y: y, z: z });
        const dist = Pocket.Tools.mag(diff);
        if (dist - radius < this.radius) {

            // Search this pocket's particles
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                const p_diff = Pocket.Tools.sub({ x: p.x, y: p.y, z: p.z }, { x: x, y: y, z: z });
                const p_dist = Pocket.Tools.mag(p_diff);
                if (p_dist - radius < p.radius) {
                    found.push(p);
                }
            }

            // Search this pocket's SubPockets
            for (let i = 0; i < this.pockets.length; i++) {
                found = found.concat(this.pockets[i].search(radius, x, y, z));
            }

        }
        return found;
    }

}

class Pocket<T> {

    static Tools = {
        MAGIC_RATIO: 1.9,
        sub: (v0: Vector, v1: Vector) => {
            return {
                x: v0.x - v1.x,
                y: v0.y - v1.y,
                z: v0.z - v1.z
            };
        },
        mag: (v: Vector) => {
            return Math.sqrt(Math.pow(Math.sqrt(v.x * v.x + v.y * v.y), 2) + v.z * v.z);
        }
    };

    root: SubPocket<T> | undefined

    constructor() {
        this.root = undefined;
    }

    put(
        obj: T,
        x: number,
        y: number,
        z = 0,
        radius = 0
    ): () => T {

        // Try to place the object in the current root
        if (this.root) {
            const result = this.root.put(obj, x, y, z, radius);
            if (result) return result;
        }

        // Either root does not exist, or put failed, so create a custom pocket for the object
        const pos = {
            x: x,
            y: y,
            z: z
        };
        const sp = new SubPocket<T>({
            parent: this,
            radius: this.root ? this.root.radius : Pocket.Tools.MAGIC_RATIO * radius,
            position: pos
        });
        if (!this.root) {
            this.root = sp;
        } else {

            // Create a new root that encompasses both the old root and new SubPocket
            const max_dist = Pocket.Tools.mag(Pocket.Tools.sub(this.root.position, sp.position)) + sp.radius; // The distance from the current root to the outside of the new SubPocket
            const new_root = new SubPocket<T>({
                parent: this,
                radius: Pocket.Tools.MAGIC_RATIO * max_dist,
                position: this.root.position
            });

            // Set the parents of the old root and new SubPocket to the new root
            this.root.parent = new_root;
            sp.parent = new_root;

            // Add the old root and new SubPocket to the new root
            new_root.pockets.push(this.root);
            new_root.pockets.push(sp);

            // Set the new root
            this.root = new_root;

        }
        const result = sp.put(obj, x, y, z, radius);
        if (!result) throw new Error("Result expected for put call...");
        return result;

    }

    /**
     * Removes the root SubPocket.
     * 
     * @param sp The SubPocket that requested to be removed
     */
    remove(sp: SubPocket<T>) {
        if (sp == this.root) {
            this.root = undefined;
        }
    }

    /**
     * Returns an array of all objects that exist wholly or partially within the given radius of the desired coordinates.
     * 
     * @param radius The radius of the search
     * @param x The x position of the center of the search
     * @param y The y position of the center of the search
     * @param z The z position of the center of the search
     */
    search(radius: number, x: number, y: number, z = 0) {
        if (this.root) {
            return this.root.search(radius, x, y, z).map(p => p.obj);
        } else {
            return new Array<T>();
        }
    }

    /**
     * Returns the closest object to the given position.
     * 
     * @param x The x position of the search point
     * @param y The y position of the search point
     * @param z The z position of the search point
     */
    closest(x: number, y: number, z = 0) {
        if (this.root) {
            const pos = { x: x, y: y, z: z };
            const step = this.root.radius / 100;
            for (let r = step; r < this.root.radius * 2; r += step) {
                const pool = this.root.search(r, x, y, z);
                if (pool.length > 0) {
                    let closest = pool[0];
                    let dist = Pocket.Tools.mag(Pocket.Tools.sub(closest, pos));
                    for (let i = 1; i < pool.length; i++) {
                        const p = pool[i];
                        const p_dist = Pocket.Tools.mag(Pocket.Tools.sub(p, pos));
                        if (p_dist < dist) {
                            closest = p;
                            dist = p_dist;
                        }
                    }
                    return closest.obj;
                }
            }
        }
        return undefined;
    }

}
