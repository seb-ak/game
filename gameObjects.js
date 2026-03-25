import { logError, vec3, Quad, loadImage } from "./utils.js";

export class gameObject {
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

export class levelTile extends gameObject {
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

export class SpawnPoint extends gameObject {
    constructor(location) {
        super(location);

        this.type = "SpawnPoint"
        this.collision = false;
        this.active = true;
    }
}

export class Player extends gameObject {
    constructor(location) {
        super(location)
        this.initialSpawn = true;
        this.spawnPoint = undefined;
        this.level = "main"

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
                const diff = obj.getPoint().bl.x - this.getPoint().br.x// - smallOffset
                this.location.x += diff;
                this.velocity.x = 0;
            }
            else if (this.velocity.x < 0) {
                const diff = obj.getPoint().br.x - this.getPoint().bl.x// + smallOffset
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
                const diff = obj.getPoint().bl.y - this.getPoint().tl.y// - smallOffset
                this.location.y += diff;
                this.velocity.y = 0;
            }
            else if (this.velocity.y < 0) {
                const diff = obj.getPoint().tl.y - this.getPoint().bl.y// + smallOffset
                this.location.y += diff;
                this.velocity.y = 0;
                this.onFloor = true;
            }
        }
        logError(`after collision: vy:${this.velocity.y.toFixed(3)} xy:${this.velocity.x.toFixed(3)} x:${this.location.x.toFixed(3)} y:${this.location.y.toFixed(3)}`)

    }

    tick(deltaTime, level) {

        if (!level.loaded) return;
        if (this.initialSpawn) {
            for (const obj of level.objects) {
                if (obj.type === "SpawnPoint") {
                    this.location = obj.location
                }
            }
        }

        this.doInputs(deltaTime);
        this.doCollision(deltaTime, level);

        this.faces[0].vertices3d = this.getFaceVertecies("front")
    }
}
