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
    let img = new Image();
    img.onload = () => {
        return img
    }
    img.onerror = () => { return false }
    img.src = path;
}

export async function arrayFromTexture(path) {
    // Source - https://stackoverflow.com/a/61516442
    // Posted by sney2002
    // Retrieved 2026-03-04, License - CC BY-SA 4.0
    // modified to fit my needs

    let img = new Image(); 
    img.onload = () => {

        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0);

        let array = []
        for (let y = 0; y < img.height; y++) {
            array[y] = [];
            for (let x = 0; x < img.width; x++) {

                const imageData = ctx.getImageData(x, y, 1, 1).data;
                data = {
                    r: imageData[0],
                    g: imageData[1],
                    b: imageData[2],
                    a: imageData[3],
                    hex: "#" + this.r.toString(16) + this.g.toString(16) + this.b.toString(16) + this.a.toString(16),
                }

                array[y][x] = data
            }
        }

        return array
    }
    img.onerror = () => { return false }
    img.src = path;
}