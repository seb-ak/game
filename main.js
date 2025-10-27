// try {
import { logError, vec3 } from "./other.js";
import { level1, level2 } from "./levels.js";
import { textureIndexes, gameTextures, Font } from "./textures.js"

class gameObject {
    constructor(location) {
        this.type = ""
        this.location = location
        this.collision = {
            up:true,
            down:true,
            left:true,
            right:true,
        };
        this.size = new vec3(1,1,1);
        this.collision = false;
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

    isCollidingWith(obj) {
        // AABB collison - Axis-Aligned Bounding Box
        // If all axis colliding
        // Xcolliding: A_minX <= B_maxX && A_maxX >= B_minX
        // Ycolliding: A_minY <= B_maxY && A_maxY >= B_minY

        const objPoints = obj.getPoint()
        const objMax = {
            x: Math.max(objPoints.tl.x, objPoints.tr.x),
            y: Math.max(objPoints.tl.y, objPoints.bl.y)
        }
        const objMin = {
            x: Math.min(objPoints.tl.x, objPoints.tr.x),
            y: Math.min(objPoints.tl.y, objPoints.bl.y)
        }

        const thisPoints = this.getPoint()
        const thisMax = {
            x: Math.max(thisPoints.tl.x, thisPoints.tr.x),
            y: Math.max(thisPoints.tl.y, thisPoints.bl.y)
        }
        const thisMin = {
            x: Math.min(thisPoints.tl.x, thisPoints.tr.x),
            y: Math.min(thisPoints.tl.y, thisPoints.bl.y)
        }

        return (
            (objMin.x < thisMax.x && objMax.x > thisMin.x) &&
            (objMin.y < thisMax.y && objMax.y > thisMin.y)
        )
        return (
            (objMin.x <= thisMax.x && objMax.x >= thisMin.x) &&
            (objMin.y <= thisMax.y && objMax.y >= thisMin.y)
        )
    }
}

class levelTile extends gameObject {
    constructor(location, type, adjacent={up:false,down:false,left:false,right:false,front:false}) {
        super(location);

        this.adjacent = adjacent;
        this.type = type;
        this.texture = "none";

        this.collision = true
        // if (!adjacent.up && !adjacent.down && !adjacent.left && !adjacent.right) this.collision = false
    }

}

class Player extends gameObject {
    constructor(location) {
        super(location)
        this.type = "player";
        this.size = new vec3(0.5,0.8,0.5);
        this.texture = "player";
        this.ticking = true;
        
        this.location.z += this.size.z/2

        this.pressedInputs = {
            up:   {keys:["w",],active:false},
            down: {keys:["s",],active:false},
            left: {keys:["a",],active:false},
            right:{keys:["d",],active:false},
            jump: {keys:[" ",],active:false},
            dash: {keys:["shift",],active:false},
        }
        document.addEventListener("keydown", (event) => {
            for (const input of Object.values(this.pressedInputs)) {
                const key = event.key.toLowerCase();
                if ( input.keys.includes(key) ) input.active = true;
            }
        });
        document.addEventListener("keyup", (event) => {
            for (const input of Object.values(this.pressedInputs)) {
                const key = event.key.toLowerCase();
                if ( input.keys.includes(key) ) input.active = false;
            }
        });

        this.friction = 0.90;
        this.jumpForce = 30;
        this.gravity = 0.005;
        this.acceleration = new vec3(0.2, 0.2, 0);
        
        this.velocity = new vec3(0, 0, 0);
        this.onFloor = false;
    }
    
    tick(deltaTime, level) {

        const diagonal = (this.pressedInputs.left.active || this.pressedInputs.right.active) && (this.pressedInputs.up.active || this.pressedInputs.down.active);
        const mult = this.acceleration.x * (this.pressedInputs.dash.active? 4 : 1) * diagonal? 0.707 : 1;
        
        if (this.velocity.y < 0) this.gravity = 0.03;
        else this.gravity = 0.01;

        this.acceleration.x = (this.pressedInputs.right.active - this.pressedInputs.left.active) * mult * deltaTime;
        this.acceleration.y = (this.onFloor && this.pressedInputs.jump.active) * this.jumpForce * deltaTime

        this.acceleration.y -= this.gravity;
        this.velocity = this.velocity.add(this.acceleration).mult(this.friction)

        this.onFloor = false;

        this.location.x += this.velocity.x
        for (const obj of level) {
            if (!obj.collision) continue;
            if (!this.isCollidingWith(obj)) continue;

            if (this.velocity.x > 0) {
                const diff = obj.getPoint().bl.x - this.getPoint().br.x
                this.location.x += diff;
                this.velocity.x = 0;
            }
            else if (this.velocity.x < 0) {
                const diff = obj.getPoint().br.x - this.getPoint().bl.x
                this.location.x += diff;
                this.velocity.x = 0;
            }
        }

        this.location.y += this.velocity.y
        for (const obj of level) {
            if (!obj.collision) continue;
            if (!this.isCollidingWith(obj)) continue;

            if (this.velocity.y > 0) {
                const diff = obj.getPoint().bl.y - this.getPoint().tl.y
                this.location.y += diff;
                this.velocity.y = 0;
            }
            else if (this.velocity.y < 0) {
                const diff = obj.getPoint().tl.y - this.getPoint().bl.y
                this.location.y += diff;
                this.velocity.y = 0;
                this.onFloor = true;
            }
        }

    }
}

class Main {
    constructor() {
        this.deltaTime = 1
        this.lastTime = 0

        this.screen = {
            width: 192,
            height: 144,
            subscreen: {
                x: 2,
                y: 2,
                width: 192-52,
                height: 144-22,
            }
        };
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
        
        this.level = {
            main:[],
            second:[]
        };
        this.levelLayer = "main"

        this.camera = {
            location: new vec3(20,2,-4),
            fov: 90,
        };

        this.frames = 0;
        this.nextSecond = 0;
        
        this.frameRateCap = 60;

        logError("started");
        requestAnimationFrame(this.update.bind(this));

    }

    // adds objects to the level from the 2d array
    generateLevel(level, main="main") {
        level = level.reverse();
        const types = {"X":"wall", " ":"air", "s":"spawn"}

        for (let y = 0; y < level.length; y++) {
            for (let x = 0; x < level[y].length; x++) {
                const type = types[level[y][x]] || "air";

                if (type === "spawn") this.level[main].push(new Player(new vec3(x,y,0)))

                if (type === "wall") {

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
    }

    // runs every frame
    update(currentTime) {
    // try {
        this.deltaTime = (currentTime - this.lastTime) / 1000
        this.lastTime = currentTime

        this.frames++;
        if (this.nextSecond < currentTime) {
            logError(`FPS: ${this.frames}`);
            this.nextSecond = currentTime + 1000;
            this.frames = 0;
        };


        for (const obj of this.level[this.levelLayer]) {

            if (obj.ticking) obj.tick(this.deltaTime, this.level[this.levelLayer]);
            if (obj.type === "player") {
                this.camera.location.x = obj.location.x
                this.camera.location.y = obj.location.y+1.5
            }

        }



        this.draw();



        requestAnimationFrame(this.update.bind(this));
    // } catch (e) {logError(e);}
    }

    draw() {
        this.ctx.fillStyle = "#003b1dff";
        this.ctx.fillRect(0, 0, this.screen.width, this.screen.height);

        this.drawLevel(this.level[this.levelLayer]);

        this.drawUi();
    }


    drawUi() {
        const mainColour = "#00a000"
        const secondaryColour = "#005000"
        this.drawFace([ // top
            new vec3(0,                 0,0),
            new vec3(this.screen.width, 0,0),
            new vec3(this.screen.width, this.screen.subscreen.y,0),
            new vec3(0,                 this.screen.subscreen.y,0)],
            mainColour
        );
        this.drawFace([ //left
            new vec3(0,                       0,0),
            new vec3(this.screen.subscreen.x, 0,0),
            new vec3(this.screen.subscreen.x, this.screen.height,0),
            new vec3(0,                       this.screen.height,0)],
            mainColour
        );
        this.drawFace([ //bottom
            new vec3(0,                 this.screen.subscreen.y + this.screen.subscreen.height,0),
            new vec3(this.screen.width, this.screen.subscreen.y + this.screen.subscreen.height,0),
            new vec3(this.screen.width, this.screen.height,0),
            new vec3(0,                 this.screen.height,0)],
            mainColour
        );
        this.drawFace([ //right
            new vec3(this.screen.subscreen.x + this.screen.subscreen.width, 0,0),
            new vec3(this.screen.width,                                     0,0),
            new vec3(this.screen.width,                                     this.screen.height,0),
            new vec3(this.screen.subscreen.x + this.screen.subscreen.width, this.screen.height,0)],
            mainColour
        );
    }
    drawLevel(level) {
        const projectedObjects = this.projectObjects(level);
        
        projectedObjects.sort((a, b) => b.distance - a.distance);
        
        for (const object of projectedObjects) {
            this.drawShape(object.vertices, textureIndexes.indexOf(object.type));
        }
    }
    projectObjects(objects, fov=this.camera.fov, w=this.screen.subscreen.width, h=this.screen.subscreen.height) {
        const fovRad = fov * Math.PI/180;
        const f = w / (2 * Math.tan(fovRad/2));

        const projectedObjects = [];
        for (const obj of objects) {

            const allAdjacent = Object.entries({up:false,down:false,left:false,right:false,front:false})

            for (const [face, adjacent] of obj.adjacent? Object.entries(obj.adjacent) : allAdjacent) {
                if (adjacent) continue;
                
                const vertices = obj.getFaceVertecies(face);
                const projectedVertices = [];
                
                let cullFace = true;
                for (const point of vertices) {
                    const translatedPoint = point.sub(this.camera.location);
                    const projectedPoint = this.projectPoint(translatedPoint, f, w, h);
                    projectedVertices.push(projectedPoint);
                    if (
                        projectedPoint.x>this.screen.subscreen.x && 
                        projectedPoint.x<this.screen.subscreen.x + this.screen.subscreen.width &&
                        projectedPoint.y>this.screen.subscreen.y && 
                        projectedPoint.y<this.screen.subscreen.y + this.screen.subscreen.height
                    ) {
                        cullFace = false;
                    }
                }
                if (cullFace) continue;

                const location = vertices[0].add(vertices[2]).div(2);
                // const location = vertices[0].add(vertices[1]).add(vertices[2]).add(vertices[3]).div(4);
                const dist = location.sub(this.camera.location).length();

                projectedObjects.push({
                    distance: dist,
                    type: obj.type,
                    face: face,
                    vertices: projectedVertices
                });
            }

        }
        return projectedObjects
    }
    projectPoint({x, y, z}, f, w, h) {
        let px = (x / z) * f + w/2;
        let py = (-y / z) * f + h/2;
        return new vec3(px, py, 0)
    }
    drawShape(points, textureId=-1, mainColour="#00a000", secondaryColour="#005000") {
        if (textureId == -1) {
            this.drawFace(points);
            return;
        }

        const texture = gameTextures[textureId];
        const textureHeight = texture.length;
        const textureWidth = texture[0].length;

        // Bilinear interpolation formula
        //  P(u, v) = (1-u)(1-v) * P0
        //            + u(1-v)   * P1
        //            + u v      * P2
        //            + (1-u)v   * P3

        function interp(u, v) {
            return  (points[0].mult((1-u)*(1-v)))
                .add(points[1].mult(   u *(1-v)))
                .add(points[2].mult(   u *   v ))
                .add(points[3].mult((1-u)*   v ));
        }
        
		for (let y=0; y<textureHeight; y++) {
			for (let x=0; x<textureWidth; x++) {
                if (texture[y][x]==="-") continue

                const u0 = x / textureWidth;
                const v0 = y / textureHeight;
                const u1 = (x + 1) / textureWidth;
                const v1 = (y + 1) / textureHeight;
                
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
main.generateLevel(level2);

// } catch (e) {logError(e);}