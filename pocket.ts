/*!
Pocket v2.0.0
(c) 2020 Trevor Richard
Released under the MIT License.
*/

/**
 * Vector interface that supports 2D and optional 3D coordinates.
 * @param x The x value of the vector
 * @param y The y value of the vector
 * @param z The optional z value of the vector. If this value is ommitted, it will be assumed to be zero.
 */
export interface Vector {
    x: number
    y: number
    z?: number
}

/**
 * A particle object that consists of both positional data and a custom data payload.
 */
export class Particle<T> implements Vector {

    // Positional Data:
    private _x: number
    private _y: number
    private _z: number
    private _radius: number = 0;

    // Custom data payload:
    public data!: T

    // Metadata: 
    private _pocket?: Pocket<T>
    private _subPocket?: SubPocket<T>

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
        radius?: number
        data?: T
    }) {
        this._x = x;
        this._y = y;
        this._z = z;
        this.radius = radius;
        if (data !== undefined) this.data = data;
    }

    /**
     * Safely moves the particle's position in the Pocket.
     * @param position The vector position to move the Particle to.
     */
    moveTo(position: Vector) {
        if (!position.z) position.z = 0;
        if (this._pocket && this._subPocket) {
            this._subPocket.retrieve(this);
            this._x = position.x;
            this._y = position.y;
            this._z = position.z;
            this._pocket.put(this);
        } else {
            this._x = position.x;
            this._y = position.y;
            this._z = position.z;
        }
    }

    /**
     * Retrieves the particle from its pocket if it exists in one.
     * @return `this`
     */
    retrieve() {
        this._subPocket?.retrieve(this);
        this._subPocket = undefined;
        this._pocket = undefined;
        return this;
    }

    /**
     * `INTERNAL USE ONLY.` Sets the pocket that this particle belongs to.
     * @dev Do not change the pocket manually. Instead, use the `Pocket.put(...)` function.
     */
    __setPocket(pocket: Pocket<T>) {
        if (this._pocket && this._pocket != pocket) throw { 
            particle: this,
            ... new Error("Particle is already in a different pocket. It must be retrieved before putting it in a new pocket")
        };
        this._pocket = pocket;
    }

    /**
     * `INTERNAL USE ONLY.` Sets the sub pocket that this particle belongs to.
     * @dev Do not change the sub pocket manually. Instead, use the moveTo(...) function
     * or equivalent positional setters.
     */
    __setSubPocket(subPocket: SubPocket<T>) {
        this._subPocket = subPocket;
    }

    /**
     * Getter for the 'x' coordinate of the particle.
     * @return The 'x' position of the particle.
     */
    get x() {
        return this._x;
    }

    /**
     * Getter for the 'y' coordinate of the particle.
     * @return The 'y' position of the particle.
     */
    get y() {
        return this._y;
    }

    /**
     * Getter for the 'z' coordinate of the particle.
     * @return The 'z' position of the particle.
     */
    get z() {
        return this._z;
    }

    /**
     * Getter for the radius of the particle.
     * @return The radius of the particle.
     */
    get radius() {
        return this._radius;
    }

    /**
     * Getter for the pocket of the particle.
     * @return The pocket that the particle belongs to, or `undefined` if it is not in a pocket.
     */
    get pocket() {
        return this._pocket;
    }

    /**
     * Safely sets the 'x' coordinate of the particle.
     * @param value The new 'x' position.
     */
    set x (value: number) {
        this.moveTo({
            x: value,
            y: this.y,
            z: this.z
        });
    }

    /**
     * Safely sets the 'y' coordinate of the particle.
     * @param value The new 'y' position.
     */
    set y (value: number) {
        this.moveTo({
            x: this.x,
            y: value,
            z: this.z
        });
    }

    /**
     * Safely sets the 'z' coordinate of the particle.
     * @param value The new 'z' position.
     */
    set z (value: number) {
        this.moveTo({
            x: this.x,
            y: this.y,
            z: value
        });
    }

    /**
     * Setter for the radius of the particle.
     * @param value The new radius of the particle.
     * @dev If a negative radius is given, it's positive counterpart will be used instead.
     */
    set radius (value: number) {
        if (value < 0) value *= -1; // ensure radius is positive
        if (this._pocket && this._subPocket) {
            this._subPocket.retrieve(this);
            this._radius = value;
            this._pocket.put(this);
        } else {
            this._radius = value;
        }
    }

}

/**
 * SubPockets are used to organize particles into sub-spaces that enable efficient positional queries.
 * @dev SubPockets are meant for internal use only and are not optimized for external interfacing.
 */
class SubPocket<T> {

    radius: number
    parent: SubPocket<T> | Pocket<T>
    pocket: Pocket<T>
    subPockets: SubPocket<T>[]
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
        this.pocket = parent instanceof Pocket ? parent : parent.pocket;
        this.subPockets = new Array<SubPocket<T>>();
        this.particles = new Array<Particle<T>>();
        this.position = position;
    }

    /**
     * Places the particle in this pocket or in a sub pocket of this pocket and returns the SubPocket it was placed in.
     * @param p The Particle to put in the SubPocket
     * @return The particle that was placed, or undefined if the particle
     */
    put(p: Particle<T>): SubPocket<T> | undefined {
        const diff = Pocket.Tools.sub(this.position, p);
        const dist = Pocket.Tools.mag(diff);
        if (dist + p.radius < this.radius) {
            if (p.radius >= this.radius / Pocket.Tools.MAGIC_RATIO || this.particles.length == 0) {

                // Add object to the pocket
                this.particles.push(p);

                // Set particle SubPocket
                p.__setSubPocket(this);

                // Return this SubPocket
                return this;

            } else {

                // Add object to a SubPocket
                for (let i = 0; i < this.subPockets.length; i++) {
                    const successfullPocket = this.subPockets[i].put(p);
                    if (successfullPocket) return successfullPocket;
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
                this.subPockets.push(sp);
                return sp.put(p);

            }
        } else {
            return undefined;
        }
    }

    /**
     * Retrieves a particle from this pocket if it is stored here and removes it.
     * @param p The particle to retrieve from this pocket
     * @dev If the subpocket is empty after retrieval (successful or unsuccessful), it will be removed from its parent pocket.
     * @return True if the particle was retrieved, false otherwise.
     */
    retrieve(p: Particle<T>): boolean {
        let numParticlesBefore = this.particles.length;
        this.particles = this.particles.filter(pp => pp != p);
        let retrieved = numParticlesBefore > this.particles.length;
        if (retrieved) {
            this.pocket.__particleRemoved();
        }
        if (this.subPockets.length == 0 && this.particles.length == 0) {
            this.parent.remove(this);
        }
        return retrieved;
    }

    /**
     * Removes a SubPocket from this pocket.
     * @param sp The SubPocket to be removed
     * @dev If this sub pocket is empty after removal (successful or unsuccessful), it will be removed from its parent pocket.
     * @return True if the sub pocket was found & removed, false otherwise.
     */
    remove(sp: SubPocket<T>): boolean {
        let numPocketsBefore = this.subPockets.length;
        this.subPockets = this.subPockets.filter(p => p != sp);
        let removed = numPocketsBefore > this.subPockets.length;
        if (this.subPockets.length == 0 && this.particles.length == 0) {
            this.parent.remove(this);
        }
        return removed;
    }

    /**
     * Returns an array of all Particles that exist wholly or partially within the given radius of the desired coordinates.
     * @param radius The radius of the search
     * @param center The 2D or 3D vector coordinates of the center of the search
     * @param set The shared set of particles to add to
     * @param transform The optional transform function to apply to the particles before checking their inclusion
     */
    search(radius: number, center: Vector, set: Set<Particle<T>>, transform?: (v: Vector) => Vector) {
        const pos = transform ? transform(this.position) : this.position;
        const diff = Pocket.Tools.sub(pos, center);
        const dist = Pocket.Tools.mag(diff);
        if (dist - radius < this.radius) {

            // Search this pocket's particles
            this.particles.forEach(p => {
                const p_pos = transform ? transform(p) : p;
                const p_diff = Pocket.Tools.sub(p_pos, center);
                const p_dist = Pocket.Tools.mag(p_diff);
                if (p_dist - radius < p.radius) {
                    set.add(p);
                }
            });

            // Search this pocket's SubPockets
            this.subPockets.forEach(pocket => {
                pocket.search(radius, center, set, transform);
            });

        }
        return set;
    }

}

/**
 * Pockets are organizational structures for Particle objects that enable efficient positional queries by
 * dynamically grouping particles into recursively smaller sub pockets.
 * @dev The searching, moving, and removal of particles are all approximately O(ln(n)) operations, providing 
 * extremely efficient positional lookups of particles at any positional scale.
 */
export class Pocket<T> {

    static Tools = {
        MAGIC_RATIO: 2,
        /**
         * Adds v0 to v1 and returns the new resulting vector.
         * @param v0 Vector 0
         * @param v1 Vector 1
         * @returns Vector(v0 + v1)
         */
        add: (v0: Vector, v1: Vector) => {
            return {
                x: v0.x + v1.x,
                y: v0.y + v1.y,
                z: (v0.z || 0) + (v1.z || 0)
            };
        },
        /**
         * Subracts v1 from v0 and returns the new resulting vector.
         * @param v0 Vector 0
         * @param v1 Vector 1
         * @returns Vector(v0 - v1)
         */
        sub: (v0: Vector, v1: Vector) => {
            return {
                x: v0.x - v1.x,
                y: v0.y - v1.y,
                z: (v0.z || 0) - (v1.z || 0)
            };
        },
        /**
         * Calculates the magnitude of a vector.
         * @param v The vector to get the magnitude of
         * @returns The magnitude of 'v'
         */
        mag: (v: Vector) => {
            return Math.sqrt(v.x * v.x + v.y * v.y + (v.z || 0) * (v.z || 0));
        },
        /**
         * Calculates the product of vector 'v' and scalar product 'a' and returns the new resulting vector.
         * @param v Vector to multiply
         * @param a Scalar to multiply by
         * @returns The product of v * a
         */
        mul: (v: Vector, a: number) => {
            return {
                x: v.x * a,
                y: v.y * a,
                z: (v.z || 0) * a
            };
        },
        /**
         * Calculates the commutative product of two vectors and returns the new resulting vector.
         * @param v0 Vector 0
         * @param v1 Vector 1
         * @returns The commutative product of 'v0' and 'v1'
         */
        mulComm: (v0: Vector, v1: Vector) => {
            return {
                x: v0.x * v1.x,
                y: v0.y * v1.y,
                z: (v0.z || 0) * (v1.z || 0)
            };
        }
    };

    private _root: SubPocket<T> | undefined
    private _count: number;

    constructor() {
        this._root = undefined;
        this._count = 0;
    }

    /**
     * Puts a particle into this pocket.
     * @param particle The particle to put into this pocket.
     * @dev The particle MUST NOT already be in a different pocket. If it is,
     * it must be retrieved before calling this function.
     * @return The particle that was placed into this pocket.
     */
    put(particle: Particle<T>): Particle<T> {

        // Set the particle's pocket reference
        particle.__setPocket(this);

        // Try to place the Particle in the current root
        if (this._root) {
            if (this._root.put(particle)) return particle;
        }

        // Either root does not exist, or put failed, so create a custom pocket for the particle
        const sp_radius = Pocket.Tools.MAGIC_RATIO * (particle.radius || 1);
        const sp = new SubPocket({
            parent: this,
            radius: this._root ? Math.max(this._root.radius, sp_radius) : sp_radius,
            position: {
                x: particle.x,
                y: particle.y,
                z: particle.z
            }
        });
        if (!this._root) {
            this._root = sp;
        } else {

            // Create a new root that encompasses both the old root and new SubPocket
            const max_dist = Pocket.Tools.mag(Pocket.Tools.sub(this._root.position, sp.position)) + sp.radius; // The distance from the current root to the outside of the new SubPocket
            const new_root = new SubPocket<T>({
                parent: this,
                radius: Pocket.Tools.MAGIC_RATIO * max_dist,
                position: this._root.position
            });

            // Set the parents of the old root and new SubPocket to the new root
            this._root.parent = new_root;
            sp.parent = new_root;

            // Add the old root and new SubPocket to the new root
            new_root.subPockets.push(this._root);
            new_root.subPockets.push(sp);

            // Set the new root
            this._root = new_root;

        }
        if (!sp.put(particle)) {
            throw new Error("Result expected for put call...");
        }

        // Add 1 to particle count:
        this._count++;

        return particle;
    }

    /**
     * Removes the root SubPocket.
     * @dev This function is designed for compatibility with `SubPocket.remove(...)`.
     * @param sp The SubPocket that requested to be removed
     * @return True if the sub pocket was found and removed, false otherwise.
     */
    remove(sp: SubPocket<T>): boolean {
        if (sp == this._root) {
            this._root = undefined;
            return true;
        } else {
            return false;
        }
    }

    /**
     * Returns an array of all particles that exist wholly or partially within the given radius of the desired coordinates.
     * @param radius The radius of the search
     * @param center The 2D or 3D Vector coordinates of the search
     * @param transform The optional transform function to apply to the particles before checking their inclusion
     * @return A set of particles that were found in the search zone.
     */
    search(radius: number, center: Vector, transform?: (v: Vector) => Vector) {
        if (!center.z) center.z = 0;
        if (this._root) {
            return this._root.search(radius, center, new Set(), transform);
        } else {
            return new Set<Particle<T>>();
        }
    }

    /**
     * Returns the closest object to the given position.
     * @param position The 2D or 3D vector coordinate of the position to search
     * @param startRadius An optional parameter to start the search radius at an expected distance.
     * @dev This function starts at a starting radius and continuously increases the search radius
     * until it finds some particles. Once some particles are found, it calculates the closest one
     * to the search position. It is recommended to set an custom starting search radius if you 
     * are working with a very large number of particles.
     * @return The closest particle to the search position, or undefined if there are no particles
     * in the pocket.
     */
    closest(position: Vector, startRadius?: number) {
        if (!position.z) position.z = 0;
        if (this._root) {
            if (!startRadius) startRadius = this._root.radius / 100;
            // Ensure the max radius will encompass the entire root pocket no matter where the position is located:
            const maxRadius = (Pocket.Tools.mag(Pocket.Tools.sub(this._root.position, position)) + this._root.radius) * 2
            for (let r = startRadius; r < maxRadius; r *= 2) {
                const pool = this.search(r, position);
                if (pool.size > 0) {
                    let closest: Particle<T> | undefined = undefined;
                    let dist: number | undefined = undefined;
                    for (const p of pool) {
                        const p_dist = Pocket.Tools.mag(Pocket.Tools.sub(p, position));
                        if (dist === undefined || p_dist < dist) {
                            closest = p;
                            dist = p_dist;
                        }
                    }
                    return <Particle<T>>closest;
                }
            }
        }
        return undefined;
    }

    /**
     * Builds a set of all the particles in the pocket.
     * @dev This is not an optimized method. If you frequently need to work with an array of all
     * particles in the pocket, it is recommended to maintain an array of all particles seperate
     * from the pocket's implementation.
     * @return A set of all particles in the pocket.
     */
    all() {
        if (!this._root) return new Set<Particle<T>>();
        return this.search(this._root.radius, this._root.position);
    }

    /**
     * `INTERNAL USE ONLY.` Subtracts one from the particle count.
     * @dev Do not call this function directly, it is automatically called when a particle is
     * retrieved from the pocket.
     */
    __particleRemoved() {
        this._count--;
    }

    /**
     * Getter for the pocket's particle count.
     * @return The number of particles in this pocket.
     */
    get count() {
        return this._count;
    }

}

