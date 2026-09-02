import { logError, vec3, Quad, loadImage } from "./utils.js";

export class UiController {

    constructor() {

        this.activeScreen = undefined

        this.screens = []

        this.createScreens();


        this.mouse = {
            x: 0,
            y: 0,
            down: false
        }




        const gameWindow = document.getElementById("gameCanvas");

        gameWindow.addEventListener("mousemove", (event) => { this.mouseMove(event) });
        gameWindow.addEventListener("mouseenter", (event) => { this.mouseMove(event) });
        gameWindow.addEventListener("mouseleave", (event) => { this.mouseMove(event); this.mouseUp(event); });

        gameWindow.addEventListener("mousedown", (event) => { this.mouseDown(event); });
        gameWindow.addEventListener("mouseup", (event) => { this.mouseUp(event); });

    }

    mouseMove(event) {
        this.mouse.x = event.offsetX;
        this.mouse.y = event.offsetY;
    }

    mouseDown(event) { this.mouse.down = true; this.mouse.isFirstEvent = true; }

    mouseUp(event) { this.mouse.down = false; this.mouse.isFirstEvent = false; }


    createScreens() {

        // define screens
        const mainMenuScreen = new UiScreen("Main Menu"); this.screens.push(mainMenuScreen);
        const settingsScreen = new UiScreen("Settings"); this.screens.push(settingsScreen);


        // main menu
        const gameTitle = new UiElement(mainMenuScreen, "Game Name", 3,0, 6,1);

        const startGameButton = new UiButton(mainMenuScreen, "Start Game", 1,2, 6,1);

        const settingsButton = new UiButton(mainMenuScreen, "Settings", 1,4, 6,1);
        settingsButton.action = () => { this.activeScreen = settingsScreen; }

        const exitButton = new UiButton(mainMenuScreen, "Exit", 1,6, 6,1);
        exitButton.action = () => { close(); }


        startGameButton.nextElement.down = settingsButton

        settingsButton.nextElement.up = startGameButton
        settingsButton.nextElement.down = exitButton

        exitButton.nextElement.up = settingsButton


        // settings menu

        const mainMenuButton = new UiButton(settingsScreen, "Main Menu", 1,2, 6,10);
        mainMenuButton.action = () => { this.activeScreen = mainMenuScreen; }


        // pause menu
        const pauseMenuScreen = new UiScreen("Pause Menu");

        const resumeButton = new UiButton(pauseMenuScreen, "Resume", 1,2, 1,3);


        this.activeScreen = mainMenuScreen
    }

    tick() {

        this.activeScreen.tick(this.mouse);

    }

    draw(ctx) {

        this.activeScreen.draw(ctx);

    }

}

class UiScreen {

    constructor(name, gridSize = 32) {

        this.elements = []
        this.gridSize = gridSize;

        this.name = name

    }

    draw(ctx) {

        for (const e of this.elements) {
            e.draw(ctx, this.gridSize);
        }
    }

    getElement(x, y) {

        x = Math.floor(x / this.gridSize);
        y = Math.floor(y / this.gridSize);

        const hovered = [];

        for (const e of this.elements) {
            if (x >= e.x &&
                x < e.x + e.width &&
                y >= e.y &&
                y < e.y + e.height
            ) {
                hovered.push(e)
            }
        }

        return hovered;

    }

    tick(mouse) {

        const hovered = this.getElement(mouse.x, mouse.y)
        if (hovered.length === 0) mouse.isFirstEvent = false;

        for (const e of this.elements) {
            if (hovered.includes(e)) {
                e.hovered = true;
                if (mouse.down && mouse.isFirstEvent) e.selected = true;
                if (e.selected && !mouse.down) {
                    if (e.action != undefined) e.action();
                    mouse.isFirstEvent = false;
                    e.hovered = false;
                    e.selected = false;
                }
            }
            else {
                e.hovered = false;
                e.selected = false;
            }
        }


    }

}

class UiElement {

    constructor(parent, text, x, y, width, height) {
        
        parent.elements.push(this);

        this.text = text;

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        this.hovered = false;
        this.selected = false;

        this.action = undefined;

        this.type = "none";

        this.nextElement = {
            up: undefined,
            down: undefined,
            left: undefined,
            right: undefined
        }

        this.action = undefined;

        this.borderWidth = 2;
        this.borderBrightness = 0;

        this.backgroundBrightness = 0;

        this.textSize = 1.0;
        this.textBrightness = 1.0;



    } 

    draw(ctx, gridSize) {

        const borderWidth = this.borderWidth 
            * ((this.selected && this.type != "none") ? 2 : 1) 
            * ((this.hovered && this.type != "none") ? 2 : 1);
        const borderBrightness = this.borderBrightness;
        
        const backgroundBrightness = this.backgroundBrightness 
            * ((this.hovered && this.type != "none") ? 2 : 1);

        const textSize = this.textSize;
        const textBrightness = this.textBrightness;

        const x = this.x * gridSize;
        const y = this.y * gridSize;
        const width = this.width * gridSize;
        const height = this.height * gridSize;


        const borderColor =     `rgba(${borderBrightness * 255},        ${borderBrightness * 255},      ${borderBrightness * 255},      1)`;
        const backgroundColor = `rgba(${backgroundBrightness * 255},    ${backgroundBrightness * 255},  ${backgroundBrightness * 255},  1)`;
        const textColor =       `rgba(${textBrightness * 255},          ${textBrightness * 255},        ${textBrightness * 255},        1)`;

        ctx.lineCap = "butt";
        ctx.lineJoin = "butt";
        ctx.lineWidth = borderWidth;

        ctx.strokeStyle = borderColor;
        ctx.fillStyle = backgroundColor;

        ctx.fillRect(x, y, width, height);
        if (borderWidth > 0) {
            ctx.strokeRect(x+Math.floor(borderWidth/2), y+Math.floor(borderWidth/2), width-borderWidth, height-borderWidth);
        }

        ctx.font = `${textSize * gridSize}px Arial`;
        ctx.fillStyle = textColor;
        ctx.fillText(this.text, x + borderWidth*2, y + textSize * gridSize - borderWidth*2);

    }

}

class UiButton extends UiElement {

    constructor(parent, text, x, y, width, height) {
        super(parent, text, x, y, width, height)

        this.type = "button"
        
        this.borderWidth = 2;
        this.borderBrightness = 0.5;

        this.backgroundBrightness = 0.05;

        this.textSize = 1.0;
        this.textBrightness = 1.0;
    }

}