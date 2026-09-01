import { logError, vec3, Quad, loadImage } from "./utils.js";

export class UiController {

    constructor() {

        this.activeScreen = undefined

        this.screens = []

        this.createScreens()

    }

    createScreens() {

        // main menu
        const mainMenuScreen = new UiScreen("Main Menu"); this.screens.push(mainMenuScreen);

        const gameTitle = new UiElement(mainMenuScreen, "Game Name", 3,0, 6,1);


        const startGameButton = new UiButton(mainMenuScreen, "Start Game", 1,2, 6,1);
        const settingsButton = new UiButton(mainMenuScreen, "Settings", 1,4, 6,1);
        const exitButton = new UiButton(mainMenuScreen, "Exit", 1,6, 6,1);

        startGameButton.nextElement.down = settingsButton

        settingsButton.nextElement.up = startGameButton
        settingsButton.nextElement.down = exitButton

        exitButton.nextElement.up = settingsButton


        // settings menu
        const settingsScreen = new UiScreen("Settings");

        const mainMenuButton = new UiButton(settingsScreen, 1,2, 1,3);


        // pause menu
        const pauseMenuScreen = new UiScreen("Pause Menu");

        const resumeButton = new UiButton(pauseMenuScreen);


        this.activeScreen = mainMenuScreen
    }

    tick() {

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

    tick() {
 
    }

}

class UiElement {

    constructor(parent, text, x, y, width, height) {
        
        parent.elements.push(this)

        this.text = text;

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        this.hovered = false;
        this.selected = false;

        this.type = "none"

        this.nextElement = {
            up: undefined,
            down: undefined,
            left: undefined,
            right: undefined
        }

        this.action = undefined

        this.text = ""

        this.borderWidth = 2;
        this.borderBrightness = 0.5;

        this.backgroundBrightness = 0.2;

        this.textSize = 1.0;
        this.textBrightness = 1.0;



    } 

    draw(ctx, gridSize) {

        const borderWidth = this.borderWidth
        const borderBrightness = this.borderBrightness;
        
        const backgroundBrightness = this.backgroundBrightness;

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
        ctx.strokeRect(x+Math.floor(borderWidth/2), y+Math.floor(borderWidth/2), width-borderWidth, height-borderWidth);

        ctx.font = `${textSize * gridSize}px Arial`;
        ctx.fillStyle = textColor;
        ctx.fillText(this.text, x, y + textSize * gridSize);

    }

}

class UiButton extends UiElement {

    constructor(parent, text, x, y, width, height) {
        super(parent, text, x, y, width, height)

        this.type = "button"
    }

}