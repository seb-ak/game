import { logError, vec3, Quad, loadImage } from "./utils.js";

export class UiController {

    constructor() {

        this.activeScreen = undefined

        this.screens = []

    }

    createScreens() {

        // main menu
        const mainMenuScreen = new UiScreen("Main Menu")

        const startGameButton = new UiButton()
        mainMenuScreen.elements.push(startGameButton)
        
        const settingsButton = new UiButton()
        mainMenuScreen.elements.push(settingsButton)

        const exitButton = new UiButton()
        mainMenuScreen.elements.push(exitButton)

        startGameButton.nextElement.down = settingsButton

        settingsButton.nextElement.up = startGameButton
        settingsButton.nextElement.down = exitButton

        exitButton.nextElement.up = settingsButton


        // settings menu
        const settingsScreen = new UiScreen("Settings")


        const mainMenuButton = new UiButton()
        settingsScreen.nextElement.push(mainMenuButton)

        // pause menu
        const pauseMenuScreen = new UiScreen("Pause Menu")

        const resumeButton = new UiButton()
        pauseMenuScreen.elements.push(resumeButton)

    }

    tick() {

    }

    draw(ctx) {

        for (const s of this.screens) {
            s.draw(ctx);
        }

    }

}

class UiScreen {

    constructor(name, gridSize = 8) {

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

    constructor() {

        this.width = 0
        this.height = 0
        this.x = 0
        this.y = 0
        
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

    } 

    draw(ctx, gridSize) {

        const borderWidth = 1;
        const borderBrightness = 0.5;
        const backgroundBrightness = 0.2;
        const textBrightness = 1.0;

        const borderColor =     `rgba(${borderBrightness * 255},        ${borderBrightness * 255},      ${borderBrightness * 255},      1)`;
        const backgroundColor = `rgba(${backgroundBrightness * 255},    ${backgroundBrightness * 255},  ${backgroundBrightness * 255},  1)`;
        const textColor =       `rgba(${textBrightness * 255},          ${textBrightness * 255},        ${textBrightness * 255},        1)`;

        ctx.lineCap = "butt";
        ctx.lineJoin = "butt";
        ctx.lineWidth = borderWidth;

        ctx.strokeStyle = borderColor;
        ctx.fillStyle = backgroundColor;

        ctx.fillRect(
            this.x*gridSize, this.y*gridSize,
            this.width*gridSize, this.height*gridSize
        );

        ctx.

    }

}

class UiButton extends UiElement {

    constructor() {
        super()

        this.type = "button"
    }

}