var Pocket;
(function (Pocket_1) {
    Pocket_1.magic_ratio = 1.9;
    function sub(v0, v1) {
        return {
            x: v0.x - v1.x,
            y: v0.y - v1.y,
            z: v0.z - v1.z
        };
    }
    Pocket_1.sub = sub;
    function mag(v) {
        return Math.sqrt(Math.pow(Math.sqrt(v.x * v.x + v.y * v.y), 2) + v.z * v.z);
    }
    Pocket_1.mag = mag;
    var SubPocket = (function () {
        function SubPocket(_a) {
            var parent = _a.parent, radius = _a.radius, position = _a.position;
            this.parent = parent;
            this.radius = radius;
            this.pockets = new Array();
            this.particles = new Array();
            this.position = position;
        }
        SubPocket.prototype.put = function (obj, radius, x, y, z) {
            if (z === void 0) { z = 0; }
            var diff = sub(this.position, { x: x, y: y, z: z });
            var dist = mag(diff);
            if (dist + radius < this.radius) {
                if (radius >= this.radius / Pocket_1.magic_ratio) {
                    this.particles.push({
                        obj: obj,
                        radius: radius,
                        x: x,
                        y: y,
                        z: z
                    });
                    var self_1 = this;
                    return function () {
                        return self_1.retrieve(obj);
                    };
                }
                else {
                    for (var i = 0; i < this.pockets.length; i++) {
                        var result = this.pockets[i].put(obj, radius, x, y, z);
                        if (result)
                            return result;
                    }
                    var sp = new SubPocket({
                        parent: this,
                        radius: this.radius / Pocket_1.magic_ratio,
                        position: {
                            x: x,
                            y: y,
                            z: z
                        }
                    });
                    this.pockets.push(sp);
                    return sp.put(obj, radius, x, y, z);
                }
            }
            else {
                return undefined;
            }
        };
        SubPocket.prototype.retrieve = function (obj) {
            this.particles = this.particles.filter(function (p) { return p.obj != obj; });
            if (this.pockets.length == 0 && this.particles.length == 0) {
                this.parent.remove(this);
            }
            return obj;
        };
        SubPocket.prototype.remove = function (sp) {
            this.pockets = this.pockets.filter(function (p) { return p != sp; });
            if (this.pockets.length == 0 && this.particles.length == 0) {
                this.parent.remove(this);
            }
        };
        SubPocket.prototype.search = function (radius, x, y, z) {
            if (z === void 0) { z = 0; }
            var found = new Array();
            var diff = sub(this.position, { x: x, y: y, z: z });
            var dist = mag(diff);
            if (dist - radius < this.radius) {
                for (var i = 0; i < this.particles.length; i++) {
                    var p = this.particles[i];
                    var p_diff = sub({ x: p.x, y: p.y, z: p.z }, { x: x, y: y, z: z });
                    var p_dist = mag(p_diff);
                    if (p_dist - radius < p.radius) {
                        found.push(p);
                    }
                }
                for (var i = 0; i < this.pockets.length; i++) {
                    found = found.concat(this.pockets[i].search(radius, x, y, z));
                }
            }
            return found;
        };
        return SubPocket;
    }());
    Pocket_1.SubPocket = SubPocket;
    var Pocket = (function () {
        function Pocket() {
            this.root = undefined;
        }
        Pocket.prototype.put = function (obj, radius, x, y, z) {
            if (z === void 0) { z = 0; }
            if (this.root) {
                var result_1 = this.root.put(obj, radius, x, y, z);
                if (result_1)
                    return result_1;
            }
            var pos = {
                x: x,
                y: y,
                z: z
            };
            var sp = new SubPocket({
                parent: this,
                radius: this.root ? this.root.radius : Pocket_1.magic_ratio * radius,
                position: pos
            });
            if (!this.root) {
                this.root = sp;
            }
            else {
                var max_dist = mag(sub(this.root.position, sp.position)) + sp.radius;
                var new_root = new SubPocket({
                    parent: this,
                    radius: Pocket_1.magic_ratio * max_dist,
                    position: this.root.position
                });
                this.root.parent = new_root;
                sp.parent = new_root;
                new_root.pockets.push(this.root);
                new_root.pockets.push(sp);
                this.root = new_root;
            }
            var result = sp.put(obj, radius, x, y, z);
            if (!result)
                throw new Error("Result expected for put call...");
            return result;
        };
        Pocket.prototype.remove = function (sp) {
            if (sp == this.root) {
                this.root = undefined;
            }
        };
        Pocket.prototype.search = function (radius, x, y, z) {
            if (z === void 0) { z = 0; }
            if (this.root) {
                return this.root.search(radius, x, y, z);
            }
            else {
                return new Array();
            }
        };
        Pocket.prototype.closest = function (x, y, z) {
            if (z === void 0) { z = 0; }
            if (this.root) {
                var pos = { x: x, y: y, z: z };
                var step = this.root.radius / 100;
                for (var r = step; r < this.root.radius * 2; r += step) {
                    var pool = this.search(r, x, y, z);
                    if (pool.length > 0) {
                        var closest = pool[0];
                        var dist = mag(sub(closest, pos));
                        for (var i = 1; i < pool.length; i++) {
                            var p = pool[i];
                            var p_dist = mag(sub(p, pos));
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
        return Pocket;
    }());
    Pocket_1.Pocket = Pocket;
})(Pocket || (Pocket = {}));
