export function logError(text) {
    const p = document.createElement("p");
    p.textContent = text;
    document.getElementById("console").appendChild(p);
    // document.getElementById("console").replaceChildren(p);
}
export function clearLog() {
    const p = document.createElement("p");
    document.getElementById("console").replaceChildren(p);
}

export class vec3 {
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

export async function loadImage(path) {
    // Source - https://stackoverflow.com/a/61516442
    // Posted by sney2002
    // Retrieved 2026-03-04, License - CC BY-SA 4.0
    // modified to fit my needs
    
    return new Promise(resolve => {
        const img = new Image();

        img.onload = () => {
    
            var canvas = document.createElement("canvas");
            var ctx = canvas.getContext("2d");
    
            ctx.drawImage(img, 0, 0);
    
            let array = []
            const imageData = ctx.getImageData(0, 0, img.width, img.height).data;
            let i = 0;
    
            for (let y = 0; y < img.height; y++) {
                array[y] = [];
                for (let x = 0; x < img.width; x++) {
    
                    const data = {
                        r: imageData[i+0],
                        g: imageData[i+1],
                        b: imageData[i+2],
                        a: imageData[i+3],
                        hex: "#" + 
                            imageData[i+0].toString(16).padStart(2,"0") + 
                            imageData[i+1].toString(16).padStart(2,"0") + 
                            imageData[i+2].toString(16).padStart(2,"0") + 
                            imageData[i+3].toString(16).padStart(2,"0"),
                    }
    
                    array[y][x] = data;
                    i += 4;
                }
            }
    
            // console.log(array)
            resolve({
                image: img,
                array: array.reverse()
            });
        }
        // img.onerror = () => { return false }
        img.src = path;
    })
}
