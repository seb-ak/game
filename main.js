import "helper.js";

class object {
    constructor(location) {
        this.location = location
        this.collision = true;
        this.size = new vec3(1,1,1);
    }
}

class Main {
    constructor() {

        this.screen = {
            width: 320,
            height: 240,
        };
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");

        setInterval(this.update.bind(this), 20);

    }

    update() {
        const points = [new vec3(0,0,0)]
        this.projectPoints()

        this.draw()
    }

    projectPoints(points, f, w, h) {
        const fovRad = fov * Math.PI/180
        const f = w / (2 * Math.tan(fovRad/2))

        for (const point of points) {
            this.projectPoint(point.location, f, w, h)
        }
    }

    projectPoint({x, y, z}, f, w, h) {
        let px = (x / z) * f + w/2;
        let py = (y / z) * f + h/2;
        return { x: px, y: py };
    }

    draw() {
        this.ctx.fillStyle = "#003b3bff";
        this.ctx.fillRect(0, 0, this.screen.width, this.screen.height);
    }
}

const main = new Main()