import { vec3 } from "wgpu-matrix";

let horPositivePressed = 0;
let horNegativePressed = 0;
let verPositivePressed = 0;
let verNegativePressed = 0;

let isShiftPressed = false;

let _cursorHorizontal = 0;
let _cursorVertical = 0;

export class Input {
    public static init(): void {
        window.addEventListener('blur', e => {
            horPositivePressed = 0;
            horNegativePressed = 0;
            verPositivePressed = 0;
            verNegativePressed = 0;
        });

        window.addEventListener('keydown', e => {
            const key = e.code;
            
            if(key === 'KeyD') horPositivePressed = 1;
            if(key === 'KeyA') horNegativePressed = 1;
            if(key === 'KeyW') verPositivePressed = 1;
            if(key === 'KeyS') verNegativePressed = 1;
            if(key === 'ShiftLeft') isShiftPressed = true;
        });

        window.addEventListener('keyup', e => {
            const key = e.code;

            if(key === 'KeyD') horPositivePressed = 0;
            if(key === 'KeyA') horNegativePressed = 0;
            if(key === 'KeyW') verPositivePressed = 0;
            if(key === 'KeyS') verNegativePressed = 0;
            if(key === 'ShiftLeft') isShiftPressed = false;
        });

        window.addEventListener('mousemove', () => {

        });
    }

    // ===
    // Getters
    // ===

    public static get axisHorizontal()   { return horPositivePressed - horNegativePressed; }

    public static get axisVertical()     { return verPositivePressed - verNegativePressed; }

    public static get axisVec3()         { return vec3.fromValues(Input.axisHorizontal, 0, Input.axisVertical); }

    public static get cursorHorizontal() { return _cursorHorizontal; }

    public static get cursorVertical()   { return _cursorVertical; }

    public static get isShiftPressed()   { return isShiftPressed; }
}