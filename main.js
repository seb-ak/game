logError("aaa")


import "/helper.js";
import { level1 } from "/levels.js";

class gameObject {
    constructor(location) {
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
        const center = location.add(this.size.mult(-0.5));
        return {
            center: center,
            tl: this.location.add(new vec3(0,           this.size.y, 0)),
            bl: this.location,
            tr: this.location.add(new vec3(this.size.x, this.size.y, 0)),
            br: this.location.add(new vec3(this.size.x, 0,           0))
        }
    }
}

class levelTile extends gameObject {
    constructor(location, type, adjacent={up:false,down:false,left:false,right:false}) {
        super(location);

        this.adjacent = adjacent;
        this.type = type;
        this.texture = "none";
    }

    getFaceVertecies(face) {
        switch(face) {
            case "front":
            return [
                this.getPoint().tl,
                this.getPoint().tr,
                this.getPoint().br,
                this.getPoint().bl,
            ]
            case "left":
            return [
                this.getPoint().tl,
                this.getPoint().tl.add(0,0,1),
                this.getPoint().bl.add(0,0,1),
                this.getPoint().bl,
            ]
            case "right":
            return [
                this.getPoint().tr,
                this.getPoint().tr.add(0,0,1),
                this.getPoint().br.add(0,0,1),
                this.getPoint().br,
            ]
            case "top":
            return [
                this.getPoint().tl,
                this.getPoint().tl.add(0,0,1),
                this.getPoint().tr.add(0,0,1),
                this.getPoint().tr,
            ]
            case "bottom":
            return [
                this.getPoint().bl,
                this.getPoint().bl.add(0,0,1),
                this.getPoint().br.add(0,0,1),
                this.getPoint().br,
            ]
        }
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

        this.camera = {
            x: 0,
            y: 0,
            fov: 90,
        }

        this.t = 0

        logError("started");
    }

    genrateLevel(level, main="main") {
        const types = {"X":"wall", " ":"air"}

        for (let y=level.length; y > 0; y--) {
            for (let x=0; x < level[x].length; x++) {

                this.level[main].push(new levelTile(
                    new vec3(x,y),
                    types[level[x][y]],
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
        try {
            this.t++
            this.camera.x = Math.sin(this.t);
            this.camera.y = Math.cos(this.t);
            this.draw();
        } catch (e) {logError(e);}
    }

    projectObjects(objects, fov=this.camera.fov, w=this.screen.width, h=this.screen.height) {
        const fovRad = fov * Math.PI/180;
        const f = w / (2 * Math.tan(fovRad/2));

        const projectedObjects = [];
        for (const obj of objects) {

            for (const {face, adjacent} of Object.keys(objects.adjacent)) {
                console.log(face, adjacent);//DEBUG
                if (adjacent) continue;
                
                const vertices = obj.getFaceVertecies(face);
                const projectedVertices = [];
                
                for (const point of vertices) {
                    point.x - this.camera.x;
                    point.y - this.camera.y;
                    face.push(this.projectPoint(point, f, w, h));
                }
                projectedObjects.push(projectedVertices);
            }
        }
        return projectedObjects
    }

    projectPoint({x, y, z}, f, w, h) {
        let px = (x / z) * f + w/2;
        let py = (y / z) * f + h/2;
        return { x: px, y: py };
    }

    draw() {
        this.ctx.fillStyle = "#003b3bff";
        this.ctx.fillRect(0, 0, this.screen.width, this.screen.height);

        this.drawLevel(this.level.main);
    }

    drawLevel(level) {
        const projectedObjects = this.projectObjects(level);
        for (const object of projectedObjects) {
            this.drawShape(object);
        }
    }

    drawShape(points, fillColour="red", outlineColour="green", textureId=NaN) {
        this.ctx.beginPath();

        this.ctx.moveTo(points[0].x, points[0].y);
        for (const i=1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }

        this.ctx.closePath();

        this.ctx.fillStyle = fillColour;
        this.ctx.fill();

        this.ctx.strokeStyle = outlineColour;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }
}

function logError(text) {
    const p = document.getElementById("console");
    p.textContent += `\n${text}`
}

const main = new Main();
main.genrateLevel(level1);