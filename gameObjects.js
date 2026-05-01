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
        const center = this.location.add(new vec3(this.size.x/2, this.size.y/2, 0));
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
    constructor(location, adjacent={up:false,down:false,left:false,right:false,front:false}, size=new vec3(1,1,1), brightness=1) {
        super(location);

        this.adjacent = adjacent;
        this.type = "levelTile";
        this.brightness = brightness;

        this.size = size

        this.collision = false
        if (adjacent.up && adjacent.down && adjacent.left && adjacent.right) this.collision = false

        if (!this.adjacent.left)  this.faces.push(new Quad(this.getFaceVertecies("left"), this.brightness))
        if (!this.adjacent.right) this.faces.push(new Quad(this.getFaceVertecies("right"), this.brightness))
        if (!this.adjacent.up)    this.faces.push(new Quad(this.getFaceVertecies("up"), this.brightness))
        if (!this.adjacent.down)  this.faces.push(new Quad(this.getFaceVertecies("down"), this.brightness))

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
        this.brightness = ["5e","e5","5e","e5","5e"];
        this.ticking = true;
        
        this.faces.push(new Quad(this.getFaceVertecies("front"), this.brightness))

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

        this.canDash = false;
        this.dashForce = 15;

        this.facingRotation = 0;
        this.facingVector = new vec3(1,0,0);
    }
    
    spawn(level) {
        for (const obj of level.objects) {
            if (obj.type !== "SpawnPoint") continue;
            this.location = obj.location;
        }
    }

    doInputs(deltaTime) {
        /////////////////////
        // movement logic //
        ///////////////////
        const xInput = this.pressedInputs.right.active - this.pressedInputs.left.active
        const yInput = this.pressedInputs.up.active - this.pressedInputs.down.active
        
        if(xInput!==0 || yInput!==0) {
            this.facingVector = new vec3(xInput, yInput, 0).normalise()
            this.facingRotation = Math.atan2(yInput, xInput);
        }
        logError(`facing rotation: ${this.facingRotation.toFixed(3)} facing vector: x:${this.facingVector.x.toFixed(3)} y:${this.facingVector.y.toFixed(3)}`)
        
        // base acceleration
        let dx = xInput*this.acceleration.x

        // if switching direction switch faster
        if (Math.sign(xInput) != Math.sign(this.velocity)) {
            dx *= 5
        }

        if (!this.onFloor) {
            dx *= 0.6
        }

        if (dx > 0) { if (this.velocity.x + dx > this.maxVel.x) dx = Math.max(0, this.maxVel.x - this.velocity.x) }
        else if (dx < 0) { if (this.velocity.x + dx < -this.maxVel.x) dx = Math.min(0, -this.maxVel.x - this.velocity.x) }
        logError(`dx: ${dx.toFixed(3)}`)
        this.velocity.x += dx

        // this.velocity.x = Math.max(-this.maxVel.x, Math.min(this.maxVel.x, this.velocity.x))

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

        /////////////////
        // Dash logic //
        ///////////////

        if (this.pressedInputs.dash.active) {

            if (this.canDash) {
                this.canDash = false;

                // const dashVector = this.facingVector.add(new vec3(0,0.5,0)).normalise().mult(this.dashForce)
                const dashVector = this.facingVector.mult(this.dashForce)

                this.velocity.x = dashVector.x// * 1.5
                this.velocity.y = dashVector.y
            }

        } else if (this.onFloor) {
            this.canDash = true;
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
    
    resolveX(obj) {        
        if (!obj.collision) return;
        if (!this.isCollidingWith(obj)) return;

        const thisCenter = this.getPoint().center
        const objCenter = obj.getPoint().center

        const overlap = new vec3(
            (this.size.x/2 + obj.size.x/2) - Math.abs(thisCenter.x - objCenter.x),
            (this.size.y/2 + obj.size.y/2) - Math.abs(thisCenter.y - objCenter.y)
        )
        if (overlap.x <= 0.001 || overlap.y <= 0.001) return;

        const dir = (thisCenter.x < objCenter.x) ? -1 : 1
        this.location.x += overlap.x * dir
        this.velocity.x = 0;
    }
    resolveY(obj) {        
        if (!obj.collision) return;
        if (!this.isCollidingWith(obj)) return;

        const thisCenter = this.getPoint().center
        const objCenter = obj.getPoint().center

        const overlap = new vec3(
            (this.size.x/2 + obj.size.x/2) - Math.abs(thisCenter.x - objCenter.x),
            (this.size.y/2 + obj.size.y/2) - Math.abs(thisCenter.y - objCenter.y)
        )
        if (overlap.x <= 0.001 || overlap.y <= 0.001) return;

        const dir = (thisCenter.y < objCenter.y) ? -1 : 1
        this.location.y += overlap.y * dir
        this.velocity.y = 0;
        if (dir === 1) this.onFloor = true;
    }
    doCollision(deltaTime, level) {
        this.onFloor = false;

        const collisionObjects = [...level.objects.filter(obj => obj !== this),...level.getCloseTo(this)]

        const steps = Math.ceil(Math.max(
            Math.abs(this.velocity.x * deltaTime) / this.size.x, 
            Math.abs(this.velocity.y * deltaTime) / this.size.y
        ))
        logError(`movement steps: ${steps}`)
        
        for (let i=0; i<steps; i++) {

            this.location.x += this.velocity.x * deltaTime / steps;
            for (const obj of collisionObjects) { this.resolveX(obj); }

            this.onFloor = false;
            this.location.y += this.velocity.y * deltaTime / steps;
            for (const obj of collisionObjects) { this.resolveY(obj); }

        }
    }

    tick(deltaTime, level) {
        if (!level.loaded) return;
        if (this.initialSpawn) {this.spawn(level); this.initialSpawn = false;}

        this.doInputs(deltaTime);

        this.doCollision(deltaTime, level);

        this.faces[0].vertices3d = this.getFaceVertecies("front");
    }
}
