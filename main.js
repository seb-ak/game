import { logError, clearLog, vec3, loadImage, Quad } from "./utils.js";
import { gameObject, levelTile, SpawnPoint, Player } from "./gameObjects.js";

class Level {
    constructor(levelFolder, z) {
        this.levelFolder = levelFolder;
        this.z = z;

        this.objects = [];
        this.gridSize = 0.3;
        this.gridCollision = [];
        this.gridObjects = [];
        this.mainQuad
        
        this.loaded = false;
        this.texture = undefined;
        
        this.collision = undefined;
        
        this.load();

    }

    async load() {
        // try {
            this.texture = await loadImage(`./levels/${this.levelFolder}/texture.png`);
            this.collision = await loadImage(`./levels/${this.levelFolder}/collision.png`);

            this.generateLevel();

            this.loaded = true;

        // } catch (error) {
        //     console.error(`Failed to load level ${this.levelFolder}:`, error);
        // }
    }

    generateLevel() {

        // COLLISION //
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
                    this.objects.push( new SpawnPoint(new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize)) );
                }
            }
        }

        // TEXTURE //
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
                const brightness = this.texture.array[y][x].r / 255

                this.objects.push(new levelTile(location, adjacent, size, brightness));
            
            }
        }

        // front face main quad
        const width = this.texture.array[0].length * this.gridSize;
        const height = this.texture.array.length * this.gridSize;
        const adjacent = { up:true, down:true, left:true, right:true, front: false }
        
        console.log(typeof this.texture.image)

        this.mainQuad = new levelTile(new vec3(0, 0, 0), adjacent, new vec3(width, height, 0), 1);
        this.mainQuad.faces.push(
            new Quad(this.mainQuad.getFaceVertecies("front"),
                this.texture.image)
        );
        
        this.mainQuad.faces[0].doCulling = false;
        this.mainQuad.isMainQuad = true;

        this.objects.push(this.mainQuad);

    }
    
    tick(deltaTime) {
        if (!this.loaded) return;

        for (const obj of this.objects) {
            if (!obj.ticking) continue;
            obj.tick(deltaTime, this);
        }
    }

    draw(ctx, camera, screen, player) {

        const w=screen.width
        const h=screen.height
        const fovRad = camera.fov * Math.PI/180;
        const f = w / (2 * Math.tan(fovRad/2));

        const resolution = 20; // camera snaps to a grid to reduce jittering of level when slowly
        const cameraLoc = new vec3(
            Math.floor(camera.location.x*resolution)/resolution,
            Math.floor(camera.location.y*resolution)/resolution,
            Math.floor(camera.location.z*resolution)/resolution,
        )
        
        const toDraw = {
            vertices: [],
            distance: [],
            brightness: [],
            order: [],
        }
        
        const objects = [...this.objects]
        if (player) objects.push(player)

        for (const obj of objects) {
            for (const face of obj.faces) {
                let [
                    face_vertices, 
                    face_distance, 
                    face_brightness
                ] = face.project2d(f, w, h, cameraLoc, new vec3(0, 0, this.z))
                
                if (face.doCulling) {
                    if (face_vertices == "culled") continue;
                    if (face_distance >= camera.maxQuadDist) continue;
                }
                if (obj.isMainQuad) {
                    face_distance -= 20
                }

                toDraw.vertices.push(face_vertices)
                toDraw.distance.push(face_distance)
                toDraw.brightness.push(face_brightness)
                toDraw.order.push(toDraw.order.length)
            }
        }
        
        toDraw.order.sort((a, b) => toDraw.distance[toDraw.order.indexOf(b)] - toDraw.distance[toDraw.order.indexOf(a)])
        
        for (let i = 0; i < toDraw.order.length; i++) {
            const o = toDraw.order[i]
            this.drawQuad(ctx, toDraw.vertices[o], toDraw.brightness[o], toDraw.distance[o])
        }

        // const [
        //     face_vertices, 
        //     face_distance, 
        //     face_brightness
        // ] = this.mainQuad.project2d(f, w, h, cameraLoc, new vec3(0, 0, this.z));

        // const x = face_vertices[0].x
        // const y = face_vertices[0].y
        // const width = face_vertices[2].x - x
        // const height = face_vertices[2].y - y
        
        // ctx.drawImage(this.texture.image, x, y, width, height);

    }

    /*
    // Source - https://stackoverflow.com/a/44558286
    // Posted by Smuj Em, modified by community. See post 'Timeline' for change history
    // Retrieved 2026-03-18, License - CC BY-SA 4.0
    
    // Create a buffer element to draw based on the Image img
    const buffer = document.createElement('canvas');
    buffer.width = img.width;
    buffer.height = img.height;
    const btx = buffer.getContext('2d');
        
    // First draw your image to the buffer
    btx.drawImage(img, 0, 0);

    // Now we'll multiply a rectangle of your chosen color
    btx.fillStyle = '#FF7700';
    btx.globalCompositeOperation = 'multiply';
    btx.fillRect(0, 0, buffer.width, buffer.height);

    // Finally, fix masking issues you'll probably incur and optional globalAlpha
    btx.globalAlpha = 0.5;
    btx.globalCompositeOperation = 'destination-in';
    btx.drawImage(img, 0, 0);
    */

    drawQuad(ctx, vertices, brightness, distance) {
        function drawSubQuad(ctx, points, subQuadBrightness) {
            // console.log(brightness)
            const c = Math.floor(subQuadBrightness * 255).toString(16).padStart(2, "0");
            const colour = `#${c}${c}${c}`;
            // console.log(colour)

            ctx.lineWidth = 2;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = colour;

            ctx.fillStyle = colour;

            ctx.beginPath();
            
            ctx.moveTo(Math.round(points[0].x), Math.round(points[0].y));
            for (let i=1; i < points.length; i++) {
                ctx.lineTo(Math.round(points[i].x), Math.round(points[i].y));
            }
            
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
        }

        const isTexture = typeof brightness != "number"

        let texture

        if (isTexture) {
            texture = brightness;
            brightness = 1;
        }

        const adjustedBrightness = Math.max(0, brightness - Math.sqrt(distance)/100 - 0.02);

        if (isTexture) {
            const x = vertices[0].x
            const y = vertices[0].y
            const width = vertices[2].x - x
            const height = vertices[2].y - y

            ctx.drawImage(texture, x, y, width, height);
        } else {
            drawSubQuad(ctx, vertices, adjustedBrightness);
        }

        // const texture = brightness;

        // const textureHeight = texture.length;
        // const textureWidth = texture[0].length;
        
        // // Bilinear interpolation formula
        // //  P(u, v) = (1-u)(1-v) * P0
        // //            + u(1-v)   * P1
        // //            + u v      * P2
        // //            + (1-u)v   * P3
        
        // function interp(u, v) {
        //     return  (vertices[0].mult((1-u)*(1-v)))
        //         .add(vertices[1].mult(   u *(1-v)))
        //         .add(vertices[2].mult(   u *   v ))
        //         .add(vertices[3].mult((1-u)*   v ));
        // }
        
		// for (let y=0; y<textureHeight; y++) {
		// 	for (let x=0; x<textureWidth; x++) {
        //         if (texture[y][x]===" ") continue

        //         const u0 = x / textureWidth;
        //         const v0 = y / textureHeight;
        //         const u1 = (x + 1) / textureWidth;
        //         const v1 = (y + 1) / textureHeight;
                
        //         const subPoints = [
        //             interp(u0, v0),
        //             interp(u1, v0),
        //             interp(u1, v1),
        //             interp(u0, v1),
        //         ];
        //         const brightness = texture[y][x];
		// 		drawSubQuad(ctx, subPoints, brightness);
		// 	}
		// }
	}

    getCloseTo(obj) {
        const distance = obj.size.mult(3)
        const close = []
        const min = obj.getPoint().bl.sub(distance).div(this.gridSize)
        const max = obj.getPoint().tr.add(distance).div(this.gridSize)

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
        
        this.frameRateCap = 5;

        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled = false;
        
        this.screen = {
            width: 192,
            height: 144,
        };
        this.camera = {
            location: new vec3(20,2,-4),
            fov: 70,
            maxQuadDist: 20
        };
        
        this.level = {
            main: new Level("test1", 0),
            second: new Level("test1", -25),
        };
        this.player = new Player(new vec3(0,0,0))

        this.levelLayer = "main"


        requestAnimationFrame(this.update.bind(this));

    }

    update(currentTime) {
        clearLog()
        
        {
            logError(`FPS: ${this.fps}`);
            
            this.deltaTime = (currentTime - this.lastTime) / 1000
            this.lastTime = currentTime
    
            this.frames++;
            if (this.nextSecond > currentTime) {
                this.fps = this.frames
                this.nextSecond = currentTime + 1000;
                this.frames = 0;
            }
        }

        for (const level of Object.values(this.level)) level.tick(this.deltaTime);

        this.player.tick(this.deltaTime, this.level[this.player.level])

        // move camera //

        const vel = new vec3(
            this.player.velocity.x / 6 * (this.player.isDashing? 1.2 : 1),
            0,//this.player.velocity.y / 30,
            this.player.velocity.z / 30
        )
        const diff = this.player.location
            .add(new vec3(0,1.5,0))
            .add(vel)
            .sub(this.camera.location)
            .div(8)
            .mult(this.deltaTime*60)

        this.camera.location.x += diff.x
        this.camera.location.y += diff.y
        // this.camera.fov = (this.player.isDashing? 71 : 70)
        this.camera.fov = Math.abs(this.player.velocity) > 5? 71 : 70

        // this.camera.location.x = obj.location.x
        // this.camera.location.y = obj.location.y+1.5

        
        this.draw();
        
        
        requestAnimationFrame(this.update.bind(this));
    // } catch (e) {logError(e);}
    }

    draw() {
        const bgColour = "1"
        this.ctx.fillStyle = `#${bgColour}${bgColour}${bgColour}`
        this.ctx.fillRect(0, 0, this.screen.width, this.screen.height);

        if (this.level["second"] && this.level["second"].loaded) {
            this.level["second"].draw(this.ctx, this.camera, this.screen, this.player.level=="second"? this.player : undefined);
        }

        if (this.level["main"] && this.level["main"].loaded) {
            this.level["main"].draw(this.ctx, this.camera, this.screen, this.player.level=="main"? this.player : undefined);
        }
        
        
        this.drawUi();
        
    }

    drawUi() {}

}

new Main();