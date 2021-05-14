/*!
 * Copyright (c) Trevor Richard
 */

namespace Pocket {

    export interface Vector {
        x: number
        y: number
        z?: number
    }

    export class Particle<T> implements Vector {

        x: number
        y: number
        z: number
        radius: number
        data: T
        pocket?: Pocket<T> | undefined
        subPocket?: SubPocket<T> | undefined

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
            this.radius = this.setRadius(radius);
            this.data = data;
        }

        /**
         * Safely moves the particle's position in the Pocket.
         * 
         * @param position The vector position to move the Particle to.
         */
        moveTo(position: Vector) {
            if (!position.z) position.z = 0;
            if (this.pocket && this.subPocket) {
                this.subPocket.retrieve(this);
                this.x = position.x;
                this.y = position.y;
                this.z = position.z;
                this.pocket.put(this);
            }
        }

        /**
         * Safely sets the radius of a particle. Only positive, non-zero numbers are permitted.
         * 
         * @param radius The radius of the particle
         */
        setRadius(radius: number) {
            if (radius <= 0) throw new Error("Particle radius must be greater than zero.");
            if (this.pocket && this.subPocket) {
                this.subPocket.retrieve(this);
                this.radius = radius;
                this.pocket.put(this);
            }
            return radius;
        }

        /**
         * Retrieves the particle from the SubPocket and returns the particle.
         */
        retrieve() {
            if (!this.subPocket) return undefined;
            return this.subPocket.retrieve(this);
        }

    }

    export class SubPocket<T> {

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
         * Places the particle in this pocket or in a sub pocket of this pocket and returns the SubPocket it was placed in.
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

                    // Set particle SubPocket
                    p.subPocket = this;

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
            this.particles = this.particles.filter(pp => pp != p);
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
         * @param transform The optional transform function to apply to the particles before checking their inclusion
         */
        search(radius: number, center: Vector, transform?: (v: Vector) => Vector) {
            var found = new Array<Particle<T>>();
            const pos = transform ? transform(this.position) : this.position;
            const diff = Pocket.Tools.sub(pos, center);
            const dist = Pocket.Tools.mag(diff);
            if (dist - radius < this.radius) {

                // Search this pocket's particles
                for (let i = 0; i < this.particles.length; i++) {
                    const p = this.particles[i];
                    const p_pos = transform ? transform(p) : p;
                    const p_diff = Pocket.Tools.sub(p_pos, center);
                    const p_dist = Pocket.Tools.mag(p_diff);
                    if (p_dist - radius < p.radius) {
                        found.push(p);
                    }
                }

                // Search this pocket's SubPockets
                for (let i = 0; i < this.pockets.length; i++) {
                    found = found.concat(this.pockets[i].search(radius, center, transform));
                }

            }
            return found;
        }

    }

    export class Pocket<T> {

        static Tools = {
            MAGIC_RATIO: 1.9,
            sub: (v0: Vector, v1: Vector) => {
                return {
                    x: v0.x - v1.x,
                    y: v0.y - v1.y,
                    z: (v0.z || 0) - (v1.z || 0)
                };
            },
            mag: (v: Vector) => {
                return Math.sqrt(v.x * v.x + v.y * v.y + (v.z || 0) * (v.z || 0));
            },
            mul: (v0: Vector, v1: Vector) => {
                return {
                    x: v0.x * v1.x,
                    y: v0.y * v1.y,
                    z: (v0.z || 0) * (v1.z || 0)
                };
            }
        };

        root: SubPocket<T> | undefined

        constructor() {
            this.root = undefined;
        }

        put(particle: Particle<T>): Particle<T> {

            // Set the particle's pocket reference
            particle.pocket = this;

            // Try to place the Particle in the current root
            if (this.root) {
                const result = this.root.put(particle);
                if (result) return result;
            }

            // Either root does not exist, or put failed, so create a custom pocket for the particle
            const sp_radius = Pocket.Tools.MAGIC_RATIO * particle.radius;
            const sp = new SubPocket({
                parent: this,
                radius: this.root ? Math.max(this.root.radius, sp_radius) : sp_radius,
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
            if (!result) {
                throw new Error("Result expected for put call...");
            }
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
         * @param transform The optional transform function to apply to the particles before checking their inclusion
         */
        search(radius: number, center: Vector, transform?: (v: Vector) => Vector) {
            if (!center.z) center.z = 0;
            if (this.root) {
                return this.root.search(radius, center, transform);
            } else {
                return new Array<Particle<T>>();
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

        /**
         * Returns an array of all the particles in the pocket. (Not an optimized method)
         */
        all() {
            if (!this.root) return new Array<Particle<T>>();
            return this.search(this.root.radius, this.root.position);
        }

    }

}
