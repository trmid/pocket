/*!
 * Copyright (c) Trevor Richard
 */
var Particle = (function () {
    function Particle(_a) {
        var x = _a.x, y = _a.y, _b = _a.z, z = _b === void 0 ? 0 : _b, _c = _a.radius, radius = _c === void 0 ? 0 : _c, data = _a.data;
        this.x = x;
        this.y = y;
        this.z = z;
        this.setRadius(radius);
        this.data = data;
    }
    Particle.prototype.moveTo = function (position) {
        if (!position.z)
            position.z = 0;
        if (this.pocket && this.subPocket) {
            this.subPocket.retrieve(this);
            this.x = position.x;
            this.y = position.y;
            this.z = position.z;
            this.pocket.put(this);
        }
    };
    Particle.prototype.setRadius = function (radius) {
        if (radius <= 0)
            throw new Error("Particle radius must be greater than zero.");
        this.radius = radius;
    };
    Particle.prototype.retrieve = function () {
        if (!this.subPocket)
            return undefined;
        return this.subPocket.retrieve(this);
    };
    return Particle;
}());
var SubPocket = (function () {
    function SubPocket(_a) {
        var parent = _a.parent, radius = _a.radius, position = _a.position;
        this.parent = parent;
        this.radius = radius;
        this.pockets = new Array();
        this.particles = new Array();
        this.position = position;
    }
    SubPocket.prototype.put = function (p) {
        var diff = Pocket.Tools.sub(this.position, p);
        var dist = Pocket.Tools.mag(diff);
        if (dist + p.radius < this.radius) {
            if (p.radius >= this.radius / Pocket.Tools.MAGIC_RATIO) {
                this.particles.push(p);
                p.subPocket = this;
                return p;
            }
            else {
                for (var i = 0; i < this.pockets.length; i++) {
                    var result = this.pockets[i].put(p);
                    if (result)
                        return result;
                }
                var sp = new SubPocket({
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
    };
    SubPocket.prototype.retrieve = function (p) {
        this.particles = this.particles.filter(function (p) { return p != p; });
        if (this.pockets.length == 0 && this.particles.length == 0) {
            this.parent.remove(this);
        }
        return p;
    };
    SubPocket.prototype.remove = function (sp) {
        this.pockets = this.pockets.filter(function (p) { return p != sp; });
        if (this.pockets.length == 0 && this.particles.length == 0) {
            this.parent.remove(this);
        }
    };
    SubPocket.prototype.search = function (radius, center) {
        var found = new Array();
        var diff = Pocket.Tools.sub(this.position, center);
        var dist = Pocket.Tools.mag(diff);
        if (dist - radius < this.radius) {
            for (var i = 0; i < this.particles.length; i++) {
                var p = this.particles[i];
                var p_diff = Pocket.Tools.sub(p, center);
                var p_dist = Pocket.Tools.mag(p_diff);
                if (p_dist - radius < p.radius) {
                    found.push(p);
                }
            }
            for (var i = 0; i < this.pockets.length; i++) {
                found = found.concat(this.pockets[i].search(radius, center));
            }
        }
        return found;
    };
    return SubPocket;
}());
var Pocket = (function () {
    function Pocket() {
        this.root = undefined;
    }
    Pocket.prototype.put = function (particle) {
        particle.pocket = this;
        if (this.root) {
            var result_1 = this.root.put(particle);
            if (result_1)
                return result_1;
        }
        var sp_radius = Pocket.Tools.MAGIC_RATIO * particle.radius;
        var sp = new SubPocket({
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
            var max_dist = Pocket.Tools.mag(Pocket.Tools.sub(this.root.position, sp.position)) + sp.radius;
            var new_root = new SubPocket({
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
        var result = sp.put(particle);
        if (!result) {
            throw new Error("Result expected for put call...");
        }
        return result;
    };
    Pocket.prototype.remove = function (sp) {
        if (sp == this.root) {
            this.root = undefined;
        }
    };
    Pocket.prototype.search = function (radius, center) {
        if (!center.z)
            center.z = 0;
        if (this.root) {
            return this.root.search(radius, center);
        }
        else {
            return new Array();
        }
    };
    Pocket.prototype.closest = function (position, startRadius) {
        if (!position.z)
            position.z = 0;
        if (this.root) {
            if (!startRadius)
                startRadius = this.root.radius / 100;
            for (var r = startRadius; r < this.root.radius * 2; r *= 2) {
                var pool = this.root.search(r, position);
                if (pool.length > 0) {
                    var closest = pool[0];
                    var dist = Pocket.Tools.mag(Pocket.Tools.sub(closest, position));
                    for (var i = 1; i < pool.length; i++) {
                        var p = pool[i];
                        var p_dist = Pocket.Tools.mag(Pocket.Tools.sub(p, position));
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
    };
    Pocket.prototype.all = function () {
        if (!this.root)
            return new Array();
        return this.search(this.root.radius, this.root.position);
    };
    Pocket.Tools = {
        MAGIC_RATIO: 1.9,
        sub: function (v0, v1) {
            return {
                x: v0.x - v1.x,
                y: v0.y - v1.y,
                z: v0.z - v1.z
            };
        },
        mag: function (v) {
            return Math.sqrt(Math.pow(Math.sqrt(v.x * v.x + v.y * v.y), 2) + v.z * v.z);
        }
    };
    return Pocket;
}());
