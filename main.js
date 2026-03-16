import { logError, clearLog, vec3, loadImage } from "./other.js";
import { level1, level2, level2_alt } from "./levels.js";
import { gameTextures } from "./textures.js"


class Quad {
    constructor(vertices, texture) {
        this.vertices3d = vertices
        this.distance = 0
        this.texture = texture
        this.doCulling = true
    }

    project2d(f, w, h, cameraLoc, offset) {
        let cullFace = true;
        const vertices2d = [];
        for (const point of this.vertices3d) {
            const translatedPoint = point.sub(cameraLoc).sub(offset);
            const projectedPoint = this.projectPoint(translatedPoint, f, w, h);

            vertices2d.push(projectedPoint)
            
            if (this.isOnScreen(projectedPoint, w, h)) cullFace = false;
        }
        if (cullFace && this.doCulling) return ["culled","culled","culled"]
        
        const center = this.vertices3d[0].add(this.vertices3d[2]).div(2);
        const distance = center.sub(cameraLoc).length();

        return [vertices2d, distance, this.texture]
    }

    isOnScreen(point, w, h) {
        return (
            point.x > 0 && point.x < w &&
            point.y > 0 && point.y < h
        );
    }

    projectPoint({x, y, z}, f, w, h) {
        let px = (x / z) * f + w/2;
        let py = (-y / z) * f + h/2;
        return new vec3(px, py, 0)
    }
}

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

        this.faces = []
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
        // return (
        //     (objMin.x <= thisMax.x && objMax.x >= thisMin.x) &&
        //     (objMin.y <= thisMax.y && objMax.y >= thisMin.y)
        // )
    }
}

class levelTile extends gameObject {
    constructor(location, adjacent={up:false,down:false,left:false,right:false,front:false}, size=new vec3(1,1,1), colour="#ffffffff") {
        super(location);

        this.adjacent = adjacent;
        this.type = "levelTile";
        this.texture = [colour];

        this.size = size

        this.collision = false
        if (adjacent.up && adjacent.down && adjacent.left && adjacent.right) this.collision = false

        if (!this.adjacent.left)  this.faces.push(new Quad(this.getFaceVertecies("left"), this.texture))
        if (!this.adjacent.right) this.faces.push(new Quad(this.getFaceVertecies("right"), this.texture))
        if (!this.adjacent.up)    this.faces.push(new Quad(this.getFaceVertecies("up"), this.texture))
        if (!this.adjacent.down)  this.faces.push(new Quad(this.getFaceVertecies("down"), this.texture))

    }

}

class Player extends gameObject {
    constructor(location) {
        super(location)
        this.type = "player";
        this.size = new vec3(0.5,1,0.5);
        this.texture = "player";
        this.ticking = true;
        
        this.faces.push(new Quad(this.getFaceVertecies("front"),this.texture))

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

        this.jumpForce = 7;
        this.baseGravity = 0.5;
        this.jumpTime = 0;
        this.maxJumpTime = 170;

        this.cyoteTime = 0;
        this.maxCyoteTime = 200;
        
        this.velocity = new vec3(0, 0, 0);
        this.onFloor = false;

        this.acceleration = new vec3(0.1, 0, 0)
        this.deceleration = new vec3(0.5, 0, 0)
        this.maxVel = new vec3(6, Infinity, Infinity)

        this.justJumped = false;
        this.lastOnFloor = false;
    }
    
    doInputs(deltaTime) {
        /////////////////////
        // movement logic //
        ///////////////////
        const xInput = this.pressedInputs.right.active - this.pressedInputs.left.active
        
        // base acceleration
        let dx = xInput*this.acceleration.x

        // if switching direction switch faster
        if (Math.sign(xInput) != Math.sign(this.velocity)) {
            dx *= 5
        }

        if (!this.onFloor) {
            dx *= 0.6
        }

        this.velocity.x += dx
        this.velocity.x = Math.max(-this.maxVel.x, Math.min(this.maxVel.x, this.velocity.x))

        // if not moving decelerate
        if (dx === 0 && this.velocity.x !== 0) {
            let decelerate = this.deceleration.x
            if (!this.onFloor) decelerate *= 1.4
            if (this.velocity.x>0) this.velocity.x = Math.max(0, this.velocity.x - decelerate)
            if (this.velocity.x<0) this.velocity.x = Math.min(0, this.velocity.x + decelerate)
        }

        // if just hit floor decelerate
        if (this.onFloor && !this.lastOnFloor) {
            let decelerate = this.deceleration.x * 5
            if (this.velocity.x>0) this.velocity.x = Math.max(0, this.velocity.x - decelerate)
            if (this.velocity.x<0) this.velocity.x = Math.min(0, this.velocity.x + decelerate)
        }
        this.lastOnFloor = this.onFloor

        ////////////////////
        // jumping logic //
        //////////////////
        if (this.cyoteTime > this.maxCyoteTime) this.cyoteTime = 0
        if (this.cyoteTime > 0) this.cyoteTime += deltaTime * 1000
        else if (this.onFloor) this.cyoteTime = deltaTime * 1000
        else this.cyoteTime = 0
        
        // hold jump to go higher
        if (this.pressedInputs.jump.active && this.jumpTime > 0 && this.jumpTime < this.maxJumpTime) {
            this.velocity.y = this.jumpForce
            this.jumpTime += deltaTime * 1000
        } else {
            this.jumpTime = 0
        }
        
        // start jump
        const canJump = this.cyoteTime > 0 && !this.justJumped
        if (canJump && this.pressedInputs.jump.active) {
            this.jumpTime += deltaTime * 1000
            this.velocity.y = this.jumpForce
            this.cyoteTime = 0
            this.justJumped = true
        }
        
        if (!this.pressedInputs.jump.active) {
            this.justJumped = false
        }

        ////////////////////
        // gravity logic //
        //////////////////
        let gravity = this.baseGravity
        const threshold = 3;
        // increase gravity when falling
        if (!this.onFloor && this.velocity.y < -threshold) {gravity*=1.6; logError("gravity: high");}
        // decrease gravity at peak of jump
        else if (!this.onFloor && this.velocity.y < threshold) {gravity*=0.8; logError("gravity: low");}
        else {gravity = this.baseGravity; logError("gravity: normal")}

        this.velocity.y -= gravity

        logError(`justJumped:${this.justJumped} gravity:${gravity.toFixed(3)} on floor:${this.onFloor} jump time:${this.jumpTime.toFixed(3)}`)
        logError(`vy:${this.velocity.y.toFixed(3)} xy:${this.velocity.x.toFixed(3)} x:${this.location.x.toFixed(3)} y:${this.location.y.toFixed(3)}`)
    }

    doCollision(deltaTime, level) {
        //////////////////////
        // collision logic //
        ////////////////////
        const collisionObjects = [...level.objects.filter(obj => obj !== this),...level.getCloseTo(this)]
        const smallOffset = 0.0001
        // x collisons //
        this.location.x += this.velocity.x * deltaTime

        for (const obj of collisionObjects) {
            if (!obj.collision) continue;
            if (!this.isCollidingWith(obj)) continue;

            if (this.velocity.x > 0) {
                const diff = obj.getPoint().bl.x - this.getPoint().br.x - smallOffset
                this.location.x += diff;
                this.velocity.x = 0;
            }
            else if (this.velocity.x < 0) {
                const diff = obj.getPoint().br.x - this.getPoint().bl.x + smallOffset
                this.location.x += diff;
                this.velocity.x = 0;
            }
        }

        // y collisions //
        this.onFloor = false;
        this.location.y += this.velocity.y * deltaTime

        for (const obj of collisionObjects) {
            if (!obj.collision) continue;
            if (!this.isCollidingWith(obj)) continue;

            if (this.velocity.y > 0) {
                const diff = obj.getPoint().bl.y - this.getPoint().tl.y - smallOffset
                this.location.y += diff;
                this.velocity.y = 0;
            }
            else if (this.velocity.y < 0) {
                const diff = obj.getPoint().tl.y - this.getPoint().bl.y + smallOffset
                this.location.y += diff;
                this.velocity.y = 0;
                this.onFloor = true;
            }
        }
        logError(`after collision: vy:${this.velocity.y.toFixed(3)} xy:${this.velocity.x.toFixed(3)} x:${this.location.x.toFixed(3)} y:${this.location.y.toFixed(3)}`)

    }

    tick(deltaTime, level) {

        this.doInputs(deltaTime);
        this.doCollision(deltaTime, level);

        this.faces[0].vertices3d = this.getFaceVertecies("front")
    }
}

class Level {
    constructor(levelFolder, z) {
        this.levelFolder = levelFolder;
        this.z = z;

        this.objects = [];
        this.gridSize = 0.2;
        this.gridCollision = [];
        this.gridObjects = [];
        this.mainQuad
        
        this.loaded = false;
        this.texture = undefined;
        
        this.collision = undefined;
        
        this.load();

    }

    async load() {
        this.texture = await loadImage(`./levels/${this.levelFolder}/texture.png`);
        this.collision = await loadImage(`./levels/${this.levelFolder}/collision.png`);
        const width = this.texture.array[0].length * this.gridSize;
        const height = this.texture.array.length * this.gridSize;
        const z = 0
        this.mainQuad = new Quad([
            new vec3(0,     0,      z),
            new vec3(width, 0,      z),
            new vec3(width, height, z),
            new vec3(0,     height, z),
        ]);
        this.mainQuad.doCulling = false;

        this.generateLevel();
        this.loaded = true;
    }

    generateLevel() {

        for (let y = 0; y < this.collision.array.length; y++) {
            this.gridCollision[y] = [];
            this.gridObjects[y] = [];
            for (let x = 0; x < this.collision.array[y].length; x++) {
                const tile = this.collision.array[y][x];
                
                this.gridCollision[y][x] = (tile.hex === "#000000ff")
                if (this.gridCollision[y][x]) {
                    const o = new gameObject(new vec3(x*this.gridSize, y*this.gridSize, 0));
                    o.size = new vec3(this.gridSize, this.gridSize, this.gridSize);
                    o.collision = true;
                    this.gridObjects[y][x] = o;
                }
                
                if (tile.hex === "#ff0000ff") {
                    // this.objects.push( new SpawnPoint(new vec3(x*this.gridSize, y*this.gridSize, 0)) );
                    this.objects.push( new Player(new vec3(x*this.gridSize, y*this.gridSize, 0)) );
                }
            }
        }


        for (let y = 0; y < this.texture.array.length; y++) {
            for (let x = 0; x < this.texture.array[y].length; x++) {

                if (this.texture.array[y][x].a === 0) continue;

                const up =    (y + 1 < this.texture.array.length   ) ? this.texture.array[y + 1][x].a!=0 : false
                const down =  (y - 1 >= 0                          ) ? this.texture.array[y - 1][x].a!=0 : false
                const left =  (x - 1 >= 0                          ) ? this.texture.array[y][x - 1].a!=0 : false
                const right = (x + 1 < this.texture.array[y].length) ? this.texture.array[y][x + 1].a!=0 : false
                
                if (up && down && left && right) continue;

                const location = new vec3(x*this.gridSize, y*this.gridSize, this.z)
                const adjacent = { up:up, down:down, left:left, right:right, front: false }
                const size = new vec3(this.gridSize, this.gridSize, this.gridSize*4)
                const colour = this.texture.array[y][x].hex

                this.objects.push(new levelTile(location, adjacent, size, colour));
            
            }
        }
    
    }
    
    draw(ctx, camera, screen) {

        const w=screen.width
        const h=screen.height
        const fovRad = camera.fov * Math.PI/180;
        const f = w / (2 * Math.tan(fovRad/2));
        
        const toDraw = {
            vertices: [],
            texture: [],
            distance: [],
            order: [],
        }
        
        for (const obj of this.objects) {
            for (const face of obj.faces) {
                const [
                    face_vertices, 
                    face_distance, 
                    face_texture
                ] = face.project2d(f, w, h, camera.location, new vec3(0, 0, this.z))
                
                if (face_vertices == "culled") continue;

                toDraw.vertices.push(face_vertices)
                toDraw.texture.push(face_texture)
                toDraw.distance.push(face_distance)
                toDraw.order.push(toDraw.order.length)
            }
        }
        
        toDraw.order.sort((a, b) => b - a)
        
        for (let i = 0; i < toDraw.order.length; i++) {
            const o = toDraw.order[i]
            this.drawQuad(ctx, toDraw.vertices[o], toDraw.texture[o], toDraw.distance[o])
        }

        const [
            face_vertices, 
            face_distance, 
            face_texture
        ] = this.mainQuad.project2d(f, w, h, camera.location, new vec3(0, 0, this.z));

        const x = face_vertices[0].x
        const y = face_vertices[0].y
        const width = face_vertices[2].x - x
        const height = face_vertices[2].y - y
        
        ctx.drawImage(this.texture.image, x, y, width, height);

    }

    drawQuad(ctx, vertices, texture, distance) {
        function drawSubQuad(ctx, points, colour) {
            ctx.beginPath();
            
            ctx.moveTo(Math.round(points[0].x), Math.round(points[0].y));
            for (let i=1; i < points.length; i++) {
                ctx.lineTo(Math.round(points[i].x), Math.round(points[i].y));
            }
            
            ctx.closePath();
            ctx.fillStyle = colour;
            ctx.fill();
            
        }
        
        const textureHeight = texture.length;
        const textureWidth = texture[0].length;
        
        // Bilinear interpolation formula
        //  P(u, v) = (1-u)(1-v) * P0
        //            + u(1-v)   * P1
        //            + u v      * P2
        //            + (1-u)v   * P3
        
        function interp(u, v) {
            return  (vertices[0].mult((1-u)*(1-v)))
            .add(vertices[1].mult(   u *(1-v)))
            .add(vertices[2].mult(   u *   v ))
            .add(vertices[3].mult((1-u)*   v ));
        }
        
		for (let y=0; y<textureHeight; y++) {
			for (let x=0; x<textureWidth; x++) {
                if (texture[y][x]===" ") continue

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
                const colour = `#${texture[y][x]}${texture[y][x]}${texture[y][x]}`;
				drawSubQuad(ctx, subPoints, colour);
			}
		}
	}

    // isCollidingWith(obj) {

    //     const objPoints = obj.getPoint()
    //     const checkPositions = [
    //         objPoints.tl.div(this.gridSize),
    //         objPoints.bl.div(this.gridSize),
    //         objPoints.tr.div(this.gridSize),
    //         objPoints.br.div(this.gridSize),

    //         objPoints.bl.add(new vec3(0, obj.size.y/2, 0)).div(this.gridSize),
    //         objPoints.br.add(new vec3(0, obj.size.y/2, 0)).div(this.gridSize),
    //     ]

    //     for (const pos of checkPositions) {
    //         const x = Math.floor(pos.x);
    //         const y = Math.floor(pos.y);
            
    //         if (x < 0 || y < 0 || y >= this.gridCollision.length || x >= this.gridCollision[y].length) {
    //             continue;
    //         }
            
    //         const colliding = this.gridCollision[y][x]

    //         if (colliding) { return true; }
    //     }
    //     return false;

    // }

    getCloseTo(obj) {
        const close = []
        const min = obj.getPoint().bl.sub(obj.size).div(this.gridSize)
        const max = obj.getPoint().tr.add(obj.size).div(this.gridSize)

        min.x = Math.min(this.gridObjects[0].length, Math.max(0, Math.floor(min.x)))
        max.x = Math.min(this.gridObjects[0].length, Math.max(0, Math.floor(max.x)))
        
        min.y = Math.min(this.gridObjects.length, Math.max(0, Math.floor(min.y)))
        max.y = Math.min(this.gridObjects.length, Math.max(0, Math.floor(max.y)))
        
        for (let y=min.y; y<max.y; y++) {
            for (let x=min.x; x<max.x; x++) {
                const o = this.gridObjects[y][x];
                if (o) close.push(o);
            }
        }

        return close;
    }

}

class Main {
    constructor() {
        this.deltaTime = 1
        this.lastTime = 0
        this.fps = 0

        this.frames = 0;
        this.nextSecond = 0;
        
        this.frameRateCap = 60;

        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled = false;
        
        this.screen = {
            width: 192,
            height: 144,
        };
        this.camera = {
            location: new vec3(20,2,-4),
            fov: 90
        };
        
        this.level = {
            main: new Level("test1", 0),
            // second: new Level("test1", 10),
        };
        this.levelLayer = "main"


        requestAnimationFrame(this.update.bind(this));

    }

    // runs every frame
    update(currentTime) {
    // try {
        clearLog()
        logError(`FPS: ${this.fps}`);
        
        this.deltaTime = (currentTime - this.lastTime) / 1000
        this.lastTime = currentTime

        this.frames++;
        if (this.nextSecond < currentTime) {
            this.fps = this.frames
            this.nextSecond = currentTime + 1000;
            this.frames = 0;
        };

        for (const level of Object.values(this.level)) {
            if (!level.loaded) continue;

            for (const obj of level.objects) {
    
                if (obj.ticking) {
                    obj.tick(this.deltaTime, level);
                }
    
                if (obj.type === "player") {
                    this.camera.location.x = obj.location.x
                    this.camera.location.y = obj.location.y+1.5
                }
    
            }

        }


        
        this.draw();
        
        
        requestAnimationFrame(this.update.bind(this));
    // } catch (e) {logError(e);}
    }

    draw() {
        const bgColour = "1"
        this.ctx.fillStyle = `#${bgColour}${bgColour}${bgColour}`
        this.ctx.fillRect(0, 0, this.screen.width, this.screen.height);

        if (this.level["second"] && this.level["second"].loaded) {
            this.level["second"].draw(this.ctx, this.camera, this.screen);
        }

        if (this.level["main"] && this.level["main"].loaded) {
            this.level["main"].draw(this.ctx, this.camera, this.screen);
        }
        

        
        this.drawUi();
        
    }

    drawUi() {}

}

const main = new Main();

