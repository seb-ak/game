try {
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
"XX     XXXXXXXXXXXX                      X",
"XX          X         XXXXXXXXXXXX       X",
"XXXX               X X          XXXXX   XX",
"XXXXXXXXXXXXXXX         XXXXX      XXXX XX",
"XXXX     XXX       XXXXXXXXXXXX    XXXX XX",
"XXXX  s         XXXXXXXXXXXXXXXXXXXXXXXXXX",
"XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
];

const gameTextures = [
    [
        "##  ",
        "  ##",
        "##  ",
        "  ##"
    ],
    [
        "# ",
        " #"
    ],
    [
        "# # # # ",
        " # # # #",
        "# # # # ",
        " # # # #",
        "# # # # ",
        " # # # #",
        "# # # # ",
        " # # # #",
    ],
    [
        "##  ## #",
        "   ###  ",
        " ###    ",
        "#      #",
        "   #### ",
        "###     ",
        " ##  ###",
        "   ##  #",
    ],
];

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
    constructor(location, type, adjacent={up:false,down:false,left:false,right:false,front:false}) {
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
        };

        this.camera = {
            location: new vec3(20,2,-4),
            fov: 90,
        };

        this.t = 0;

        logError("started");
        setInterval(this.update.bind(this), 20);
        // this.update();

        this.inputs = {
            up:false,
            down:false,
            left:false,
            right:false,
            jump:false,
            dash:false,
        }
    }

    // adds objects to the level from the 2d array
    generateLevel(level, main="main") {
        const types = {"X":"wall", " ":"air"}
        for (let y = level.length - 1; y >= 0; y--) {
            for (let x = 0; x < level[y].length; x++) {
                const type = types[level[y][x]] || "air";

                if (type !== "wall") continue;

                const up =    (y + 1 < level.length)    ? level[y + 1][x] === "X" : false;
                const down =  (y - 1 >= 0)              ? level[y - 1][x] === "X" : false;
                const left =  (x - 1 >= 0)              ? level[y][x - 1] === "X" : false;
                const right = (x + 1 < level[y].length) ? level[y][x + 1] === "X" : false;

                this.level[main].push(new levelTile(
                    new vec3(x, y, 0),
                    type,
                    {
                        up, down, left, right,
                        front: false,
                    }
                ));
            }
        }
    }

    update() {
        try {
            this.t++
            // this.camera.location.x = 20 + Math.sin(this.t/60)*15;
            // this.camera.location.y = 4 + Math.cos(this.t/120)*1;
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
        return new vec3(px, py, 0)
    }

    draw() {
        this.ctx.fillStyle = "#003b1dff";
        this.ctx.fillRect(0, 0, this.screen.width, this.screen.height);

        this.drawLevel(this.level.main);
    }

    drawLevel(level) {
        const projectedObjects = this.projectObjects(level);

        for (const object of projectedObjects) { // draw not front faces first
            if (object[0].face==="front") continue;
            this.drawShape(object, 2);
        }
        for (const object of projectedObjects) { // front faces drawn last
            if (object[0].face!=="front") continue;
            this.drawShape(object, 2);
        }
    }

    drawShape(points, textureId=null, mainColour="#00a000", secondaryColour="#005000") {
        let cullFace = true;
        for (const p of points) {
            if (
                p.x>0 && p.x<this.screen.width &&
                p.y>0 && p.y<this.screen.height
            ) {
                cullFace = false;
                break;
            }
        }
        if (cullFace) return;

        if (textureId===null) {
            this.drawFace(points);
            return;
        }

        const texture = gameTextures[textureId];
        const textureSize = texture.length;

        function interp(u, v) {
            return points[0].mult((1-u)*(1-v))
                .add(points[1].mult(   u *(1-v)))
                .add(points[2].mult(   u *   v ))
                .add(points[3].mult((1-u)*   v ));
        }
        
		for (let y=0; y<textureSize; y++) {
			for (let x=0; x<textureSize; x++) {
                const u0 = x / textureSize;
                const v0 = y / textureSize;
                const u1 = (x + 1) / textureSize;
                const v1 = (y + 1) / textureSize;

                // Bilinear interpolation formula
                //  P(u, v) = (1-u)(1-v) * P0
                //            + u(1-v)   * P1
                //            + u v      * P2
                //            + (1-u)v   * P3
                
                const subPoints = [
                    interp(u0, v0),
                    interp(u1, v0),
                    interp(u1, v1),
                    interp(u0, v1),
                ];
                const colour = texture[y][x]==="#" ? mainColour : secondaryColour;
				this.drawFace(subPoints, colour);
			}
		}
		
	}

    drawFace(points, colour="#005000") {//, outlineColour="#00a000", textureId=NaN) {
        this.ctx.beginPath();

        this.ctx.moveTo(Math.round(points[0].x), Math.round(points[0].y));
        for (let i=1; i < points.length; i++) {
            this.ctx.lineTo(Math.round(points[i].x), Math.round(points[i].y));
        }

        // this.ctx.moveTo(points[0].x, points[0].y);
        // for (let i=1; i < points.length; i++) {
        //     this.ctx.lineTo(points[i].x, points[i].y);
        // }

        this.ctx.closePath();

        this.ctx.fillStyle = colour;
        this.ctx.fill();

        // this.ctx.strokeStyle = colour;
        // this.ctx.lineWidth = 1;
        // this.ctx.stroke();
    }
}

const main = new Main();
main.generateLevel(level1);


} catch (e) {logError(e);}