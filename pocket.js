/*!
Pocket v1.0.4
(c) 2020 Trevor Richard
Released under the MIT License.
*/
export class Particle {
    constructor({ x, y, z = 0, radius = 0, data }) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.radius = this.setRadius(radius);
        this.data = data;
    }
    moveTo(position) {
        if (!position.z)
            position.z = 0;
        if (this.pocket && this.subPocket) {
            this.subPocket.retrieve(this);
            this.x = position.x;
            this.y = position.y;
            this.z = position.z;
            this.pocket.put(this);
        }
    }
    setRadius(radius) {
        if (radius <= 0)
            throw new Error("Particle radius must be greater than zero.");
        if (this.pocket && this.subPocket) {
            this.subPocket.retrieve(this);
            this.radius = radius;
            this.pocket.put(this);
        }
        return radius;
    }
    retrieve() {
        if (!this.subPocket)
            return undefined;
        return this.subPocket.retrieve(this);
    }
}
export class SubPocket {
    constructor({ parent, radius, position }) {
        this.parent = parent;
        this.radius = radius;
        this.pockets = new Array();
        this.particles = new Array();
        this.position = position;
    }
    put(p) {
        const diff = Pocket.Tools.sub(this.position, p);
        const dist = Pocket.Tools.mag(diff);
        if (dist + p.radius < this.radius) {
            if (p.radius >= this.radius / Pocket.Tools.MAGIC_RATIO) {
                this.particles.push(p);
                p.subPocket = this;
                return p;
            }
            else {
                for (let i = 0; i < this.pockets.length; i++) {
                    const result = this.pockets[i].put(p);
                    if (result)
                        return result;
                }
                const sp = new SubPocket({
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
        }
        else {
            return undefined;
        }
    }
    retrieve(p) {
        this.particles = this.particles.filter(pp => pp != p);
        if (this.pockets.length == 0 && this.particles.length == 0) {
            this.parent.remove(this);
        }
        return p;
    }
    remove(sp) {
        this.pockets = this.pockets.filter(p => p != sp);
        if (this.pockets.length == 0 && this.particles.length == 0) {
            this.parent.remove(this);
        }
    }
    search(radius, center, set, transform) {
        const pos = transform ? transform(this.position) : this.position;
        const diff = Pocket.Tools.sub(pos, center);
        const dist = Pocket.Tools.mag(diff);
        if (dist - radius < this.radius) {
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                const p_pos = transform ? transform(p) : p;
                const p_diff = Pocket.Tools.sub(p_pos, center);
                const p_dist = Pocket.Tools.mag(p_diff);
                if (p_dist - radius < p.radius) {
                    set.add(p);
                }
            }
            for (let i = 0; i < this.pockets.length; i++) {
                this.pockets[i].search(radius, center, set, transform);
            }
        }
        return set;
    }
}
export class Pocket {
    constructor() {
        this.root = undefined;
    }
    put(particle) {
        particle.pocket = this;
        if (this.root) {
            const result = this.root.put(particle);
            if (result)
                return result;
        }
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
        }
        else {
            const max_dist = Pocket.Tools.mag(Pocket.Tools.sub(this.root.position, sp.position)) + sp.radius;
            const new_root = new SubPocket({
                parent: this,
                radius: Pocket.Tools.MAGIC_RATIO * max_dist,
                position: this.root.position
            });
            this.root.parent = new_root;
            sp.parent = new_root;
            new_root.pockets.push(this.root);
            new_root.pockets.push(sp);
            this.root = new_root;
        }
        const result = sp.put(particle);
        if (!result) {
            throw new Error("Result expected for put call...");
        }
        return result;
    }
    remove(sp) {
        if (sp == this.root) {
            this.root = undefined;
        }
    }
    search(radius, center, transform) {
        if (!center.z)
            center.z = 0;
        if (this.root) {
            return this.root.search(radius, center, new Set(), transform);
        }
        else {
            return new Set();
        }
    }
    closest(position, startRadius) {
        if (!position.z)
            position.z = 0;
        if (this.root) {
            if (!startRadius)
                startRadius = this.root.radius / 100;
            for (let r = startRadius; r < this.root.radius * 2; r *= 2) {
                const pool = this.search(r, position);
                if (pool.size > 0) {
                    let closest = undefined;
                    let dist = undefined;
                    for (const p of pool) {
                        const p_dist = Pocket.Tools.mag(Pocket.Tools.sub(p, position));
                        if (dist === undefined || p_dist < dist) {
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
    all() {
        if (!this.root)
            return new Set();
        return this.search(this.root.radius, this.root.position);
    }
}
Pocket.Tools = {
    MAGIC_RATIO: 1.9,
    sub: (v0, v1) => {
        return {
            x: v0.x - v1.x,
            y: v0.y - v1.y,
            z: (v0.z || 0) - (v1.z || 0)
        };
    },
    mag: (v) => {
        return Math.sqrt(v.x * v.x + v.y * v.y + (v.z || 0) * (v.z || 0));
    },
    mul: (v0, v1) => {
        return {
            x: v0.x * v1.x,
            y: v0.y * v1.y,
            z: (v0.z || 0) * (v1.z || 0)
        };
    }
};
