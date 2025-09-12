import "helper.js";
import { level1 } from "./levels";

class object {
    constructor() {
        this.location = location
        this.collision = {
            up:true,
            down:true,
            left:true,
            right:true,
        };
        this.size = new vec3(1,1,1);
    }
    
    getPoint() {
        const center = location.add(this.size.mult(-0.5))
        return {
            center: center
            tl: this.location.add(new vec3(0, this.size.y, 0))
            bl: this.location
            tr: this.location.add(new vec3(this.size.x, this.size.y, 0))
            br: this.location.add(new vec3(this.size.x, 0, 0))
        }
    }
}

class levelTile extends object {
    constructor(location, type, adjacent={up:false,down:false,left:false,right:false}) {
        this.location = location
        this.adjacent = {
            up:false,
            down:false,
            left:false,
            right:false,
        }
        this.type = type
        this.texture = "none"
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

        this.level = {
            main:[],
            second:[]
        }

    }

    genrateLevel(level, main="main") {
        const types = {"X":"wall", " ":"air"}

        for (let y=level.length; y > 0; y--) {
            for (let x=0; i < level[x].length; x++) {

                this.level[main].push(new levelTile(
                    new vec3(x,y),
                    {
                        up:   level[y-1][x] == "X",
                        down: level[y+1][x] == "X",
                        left: level[y][x-1] == "X",
                        right:level[y][x+1] == "X"
                    }
                ))

            }
        }
    }

    update() {
        const points = [new vec3(0,0,0)]
        this.projectPoints()

        this.draw()
    }

    projectObjects(objects, f, w, h) {
        const fovRad = fov * Math.PI/180
        const f = w / (2 * Math.tan(fovRad/2))
        for (const obj of objects) {

            for (const point of obj) {
                this.projectPoint(point.location, f, w, h)
            }
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