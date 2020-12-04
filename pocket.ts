interface Vector {
    x: number
    y: number
    z?: number
}

class SubPocket<T> {

    radius: number
    parent: SubPocket<T> | undefined
    pockets: SubPocket<T>[]
    objects: T[]
    position: Vector

    constructor({
        parent,
        radius = 100,
        position
    }: {
        parent?: SubPocket<T>
        radius?: number,
        position: Vector
    }) {
        this.parent = parent;
        this.radius = radius;
        this.pockets = new Array<SubPocket<T>>();
        this.objects = new Array<T>();
        this.position = position;
    }

    // Returns a function to call when the object needs to be taken out of the pocket
    put(obj: T, radius: number, x: number, y: number, z?: number) {
        if (radius > this.radius / 2) {

            // Add object to pocket
            this.objects.push(obj);

            // Generate removal function
            const self = this;
            return () => {
                return self.remove(obj);
            };

        } else {
            // Add object to sub pocket
            // for(){}
        }
    }

    remove(obj: T) {
        this.objects = this.objects.filter(o => o != obj);
        return obj;
    }

}

class Pocket<T> {

    root: SubPocket<T> | undefined

    constructor() { }

}