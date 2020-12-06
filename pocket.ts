
interface Vector {
    x: number
    y: number
    z: number
}

class Particle<T> implements Vector {

    x: number
    y: number
    z: number
    radius: number
    data: T
    pocket?: Pocket<T>
    retrieve?: () => Particle<T>

    constructor({
        x,
        y,
        z = 0,
        radius = 0,
        data
    }: {
        x: number
        y: number
        z?: number
        radius: number,
        data: T
    }) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.radius = radius;
        this.data = data;
    }

    /**
     * Safely moves the particle's position in the Pocket.
     * 
     * @param position The vector position to move the Particle to.
     */
    moveTo(position: Vector) {
        if (!position.z) position.z = 0;
        if (this.pocket) {
            if (this.retrieve) this.retrieve();
            this.x = position.x;
            this.y = position.y;
            this.z = position.z;
            this.pocket.put(this);
        }
    }

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
     * Places the particle in this pocket or in a sub pocket of this pocket and returns the particle
     * 
     * @param p The Particle to put in the SubPocket
     */
    put(p: Particle<T>): Particle<T> | undefined {
        const diff = Pocket.Tools.sub(this.position, p);
        const dist = Pocket.Tools.mag(diff);
        if (dist + p.radius < this.radius) {
            if (p.radius >= this.radius / Pocket.Tools.MAGIC_RATIO) {

                // Add object to the pocket
                this.particles.push(p);

                // Set retrieval function
                const self = this;
                p.retrieve = () => {
                    return self.retrieve(p);
                };

                // Return the Particle
                return p;

            } else {

                // Add object to a SubPocket
                for (let i = 0; i < this.pockets.length; i++) {
                    const result = this.pockets[i].put(p);
                    if (result) return result;
                }

                // Doesn't fit in any SubPockets so we will create a new one with half the radius of this one, centered at the object's position
                const sp = new SubPocket<T>({
                    parent: this,
                    radius: this.radius / Pocket.Tools.MAGIC_RATIO,
                    position: {
                        x: p.x,
                        y: p.y,
                        z: p.z
                    }
                });
                this.pockets.push(sp);
                return sp.put(p);

            }
        } else {
            return undefined;
        }
    }

    /**
     * Retrieves a particle from this pocket if it is stored here and removes it from the pocket. The call will always return the particle regardless if it exists in the pocket or not.
     * 
     * @param p The particle to retrieve from this pocket
     */
    retrieve(p: Particle<T>) {
        this.particles = this.particles.filter(p => p != p);
        if (this.pockets.length == 0 && this.particles.length == 0) {
            this.parent.remove(this);
        }
        return p;
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
     * Returns an array of all Particles that exist wholly or partially within the given radius of the desired coordinates.
     * 
     * @param radius The radius of the search
     * @param center The 2D or 3D vector coordinates of the center of the search
     */
    search(radius: number, center: Vector) {
        var found = new Array<Particle<T>>();
        const diff = Pocket.Tools.sub(this.position, center);
        const dist = Pocket.Tools.mag(diff);
        if (dist - radius < this.radius) {

            // Search this pocket's particles
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                const p_diff = Pocket.Tools.sub(p, center);
                const p_dist = Pocket.Tools.mag(p_diff);
                if (p_dist - radius < p.radius) {
                    found.push(p);
                }
            }

            // Search this pocket's SubPockets
            for (let i = 0; i < this.pockets.length; i++) {
                found = found.concat(this.pockets[i].search(radius, center));
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

    put(particle: Particle<T>): Particle<T> {

        // Try to place the Particle in the current root
        if (this.root) {
            const result = this.root.put(particle);
            if (result) return result;
        }

        // Either root does not exist, or put failed, so create a custom pocket for the particle
        const sp = new SubPocket({
            parent: this,
            radius: this.root ? this.root.radius : Pocket.Tools.MAGIC_RATIO * particle.radius,
            position: {
                x: particle.x,
                y: particle.y,
                z: particle.z
            }
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
        const result = sp.put(particle);
        if (!result) throw new Error("Result expected for put call...");

        // Set the particle's pocket reference and return
        particle.pocket = this;
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
     * @param center The 2D or 3D Vector coordinates of the search
     */
    search(radius: number, center: Vector) {
        if (!center.z) center.z = 0;
        if (this.root) {
            return this.root.search(radius, center);
        } else {
            return new Array();
        }
    }

    /**
     * Returns the closest object to the given position.
     * 
     * @param position The 2D or 3D vector coordinate of the position to search
     */
    closest(position: Vector, startRadius?: number) {
        if (!position.z) position.z = 0;
        if (this.root) {
            if (!startRadius) startRadius = this.root.radius / 100;
            for (let r = startRadius; r < this.root.radius * 2; r *= 2) {
                const pool = this.root.search(r, position);
                if (pool.length > 0) {
                    let closest = pool[0];
                    let dist = Pocket.Tools.mag(Pocket.Tools.sub(closest, position));
                    for (let i = 1; i < pool.length; i++) {
                        const p = pool[i];
                        const p_dist = Pocket.Tools.mag(Pocket.Tools.sub(p, position));
                        if (p_dist < dist) {
                            closest = p;
                            dist = p_dist;
                        }
                    }
                    return closest;
                }
            }
        }
        return undefined;
    }

}
