// import { vec3 } from "/helper.js";
// import { level1 } from "/levels.js";
// moved the imports into this single file to stop the: Cross-Origin Request Blocked error

//////////////////////////////////////////////////////////////////////////////////////////////////
//----------------------------------------- helper.js -----------------------------------------//
////////////////////////////////////////////////////////////////////////////////////////////////
function logError(text) {
    const p = document.createElement("p");
    p.textContent = text;
    document.getElementById("console").appendChild(p);
}

class vec3 {
    constructor(x=NaN, y=NaN, z=NaN) {
        this.x = x
        this.y = y
        this.z = z
    }

    add(vec) {
        return new vec3(
            this.x + vec.x,
            this.y + vec.y,
            this.z + vec.z
        )
    }

    sub(vec) {
        return new vec3(
            this.x - vec.x,
            this.y - vec.y,
            this.z - vec.z
        )
    }

    mult(n) {
        return new vec3(
            this.x * n,
            this.y * n,
            this.z * n
        )
    }

    div(n) {
        return new vec3(
            this.x / n,
            this.y / n,
            this.z / n
        )
    }

    length() {
        return Math.sqrt(
            Math.pow(this.x, 2) +
            Math.pow(this.y, 2) +
            Math.pow(this.z, 2)
        )
    }

    normalise() {
        const len = this.length()
        return this.div(len)
    }
}
//////////////////////////////////////////////////////////////////////////////////////////////////
//----------------------------------------- levels.js -----------------------------------------//
////////////////////////////////////////////////////////////////////////////////////////////////

const level1 = [
"XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"XX     XXXXX          XXXXXXXXXXXXXXXXXXXX",
"XXXX                            XXXXXXXXXX",
"XXXXXXXXXXXXXXX         XXXXX      XXXXXXX",
"XXXX               XXXXXXXXXXXX    XXXXXXX",
"XXXX  s         XXXXXXXXXXXXXXXXXXXXXXXXXX",
"XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
]

//////////////////////////////////////////////////////////////////////////////////////////////////
//------------------------------------------ main.js ------------------------------------------//
////////////////////////////////////////////////////////////////////////////////////////////////
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
        const center = this.location.add(this.size.mult(-0.5));
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
                ];
            case "left":
                return [
                    this.getPoint().tl,
                    this.getPoint().tl.add(new vec3(0,0,1)),
                    this.getPoint().bl.add(new vec3(0,0,1)),
                    this.getPoint().bl,
                ];
            case "right":
                return [
                    this.getPoint().tr,
                    this.getPoint().tr.add(new vec3(0,0,1)),
                    this.getPoint().br.add(new vec3(0,0,1)),
                    this.getPoint().br,
                ];
            case "up":
                return [
                    this.getPoint().tl,
                    this.getPoint().tl.add(new vec3(0,0,1)),
                    this.getPoint().tr.add(new vec3(0,0,1)),
                    this.getPoint().tr,
                ];
            case "down":
                return [
                    this.getPoint().bl,
                    this.getPoint().bl.add(new vec3(0,0,1)),
                    this.getPoint().br.add(new vec3(0,0,1)),
                    this.getPoint().br,
                ];
            default:
                return [];
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

        this.level = {
            main:[],
            second:[]
        }

        this.camera = {
            location: new vec3(0,0,-8),
            fov: 90,
        }

        this.t = 0

        logError("started");
        setInterval(this.update.bind(this), 20);
        // this.update()

    }

    generateLevel(level, main="main") {
        const types = {"X":"wall", " ":"air"}

        for (let y=level.length-1; y >= 0; y--) {
            for (let x=0; x < level[y].length; x++) {

                // const up   = y+1 < level.length?    false : level[y+1][x] === "X";
                // const down = y-1 > 0?               false : level[y-1][x] === "X";
                // const left = x-1 < level[y].length? false : level[y][x-1] === "X";
                // const right= x+1 > 0?               false : level[y][x+1] === "X";

                let up=false; let down=false; let left=false; let right=false;

                try { up = level[y+1][x] !== "X";    } catch(e) {}
                try { down = level[y-1][x] !== "X";  } catch(e) {}
                try { left = level[y][x-1] !== "X";  } catch(e) {}
                try { right = level[y][x+1] !== "X"; } catch(e) {}

                this.level[main].push(new levelTile(
                    new vec3(x,y,0),
                    types[level[y][x]],
                    {
                        up, down, left, right,
                        front: types[level[y][x]] === "wall",
                    }
                ))

            }
        }
    }

    update() {
        try {
            this.t++
            this.camera.location.x = 20 + Math.sin(this.t/60)*15;
            this.camera.location.y = 5 + Math.cos(this.t/50)*3;
            this.draw();
        } catch (e) {logError(e);}
    }

    projectObjects(objects, fov=this.camera.fov, w=this.screen.width, h=this.screen.height) {
        const fovRad = fov * Math.PI/180;
        const f = w / (2 * Math.tan(fovRad/2));

        const projectedObjects = [];
        for (const obj of objects) {

            for (const [face, adjacent] of Object.entries(obj.adjacent)) {
                if (adjacent) continue;
                
                const vertices = obj.getFaceVertecies(face);
                const projectedVertices = [];
                
                for (const point of vertices) {
                    const translatedPoint = point.sub(this.camera.location);
                    const projectedPoint = this.projectPoint(translatedPoint, f, w, h);
                    projectedPoint.face = face;
                    projectedVertices.push(projectedPoint);
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

        for (const object of projectedObjects) { // draw not front faces first
            if (object[0].face==="front") continue; 
            this.drawShape(object);
        }
        // for (const object of projectedObjects) { // front faces drawn last
        //     if (object[0].face!=="front") continue;
        //     this.drawShape(object);
        // }
    }

    drawShape(points, fillColour="#005000", outlineColour="#00a000", textureId=NaN) {
        this.ctx.beginPath();

        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i=1; i < points.length; i++) {
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

const main = new Main();
main.generateLevel(level1);