import { Vec2, mat4, quat, vec2, vec3, vec4 } from "wgpu-matrix";

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const valueSpan = document.createElement('span');

const slider = document.createElement('input');
slider.type = 'range';
slider.min = "0";
slider.max = "1";
slider.step = "0.01";
slider.oninput = update;

canvas.after(slider);

slider.after(valueSpan);

const size = 800;
const offset = 15;

canvas.style.width = (size + offset * 2) + 'px';
canvas.style.height = (size + offset * 2) + 'px';
canvas.style.margin = '50px';

canvas.height = size + offset * 2;
canvas.width = size + offset * 2;

ctx.lineWidth = 5;

const p1 = vec2.create(0, 1);
const p2 = vec2.create(1, 1 - 0.19);
const p3 = vec2.create(0.23, 1 - 0);
const p4 = vec2.create(1, 0);

drawCurve();

function update() {
    ctx.clearRect(0, 0, size + offset * 2, size + offset * 2);

    drawCurve();
    drawT(Number(slider.value));

    valueSpan.innerText = slider.value;
}

function drawCurve() {

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 0, 0, 1)';

    ctx.moveTo(p1[0]!, p1[1]!);
    let isFirst = true;

    const dotsCount = 100;

    const matrix4 = mat4.create(
        1, 0, 0, 0,
        -3, 3, 0, 0,
        3, -6, 3, 0,
        -1, 3, -3, 1
    );

    const matrixPoints = mat4.create(
        ...p1, 0, 0,
        ...p2, 0, 0,
        ...p3, 0, 0,
        ...p4, 0, 0
    );
    
    const matrixMul = mat4.mul(matrixPoints, matrix4);

    for(let i=0; i <= dotsCount; i++) {
        const t = i / dotsCount;

        const tVec = vec4.create(1, t, t * t, t * t * t);

        const point = vec4.transformMat4(tVec, matrixMul);

        isFirst ?
            ctx.moveTo(point[0]! * size + offset, point[1]! * size + offset) :
            ctx.lineTo(point[0]! * size + offset, point[1]! * size + offset);

        isFirst = false;
    }

    ctx.stroke();
}

function drawT(t: number) {
    const a1 = vec2.lerp(p1, p2, t);
    const a2 = vec2.lerp(p2, p3, t);
    const a3 = vec2.lerp(p3, p4, t);

    const b1 = vec2.lerp(a1, a2, t);
    const b2 = vec2.lerp(a2, a3, t);

    const point = vec2.lerp(b1, b2, t);

    // ===
    drawLine(p1, p2, 'rgba(175, 0, 0, 0.5)');
    drawLine(p2, p3, 'rgba(175, 0, 0, 0.5)');
    drawLine(p3, p4, 'rgba(175, 0, 0, 0.5)');

    drawPoint(p1, 'rgba(255, 0, 0, 0.5)');
    drawPoint(p2, 'rgba(255, 0, 0, 0.5)');
    drawPoint(p3, 'rgba(255, 0, 0, 0.5)');
    drawPoint(p4, 'rgba(255, 0, 0, 0.5)');

    drawLine(a1, a2, 'rgba(0, 175, 0, 0.5)');
    drawLine(a2, a3, 'rgba(0, 175, 0, 0.5)');

    drawPoint(a1, 'rgba(0, 255, 0, 0.5)');
    drawPoint(a2, 'rgba(0, 255, 0, 0.5)');
    drawPoint(a3, 'rgba(0, 255, 0, 0.5)');

    drawLine(b1, b2, 'rgba(0, 0, 175, 0.5)');

    drawPoint(b1, 'rgba(0, 0, 255, 0.5)');
    drawPoint(b2, 'rgba(0, 0, 255, 0.5)');

    drawPoint(point, 'rgba(0, 255, 255, 0.9)');

}

function drawPoint(point: Vec2, style: string) {
    ctx.beginPath();
    ctx.fillStyle = style;
    ctx.arc(point[0]! * size + offset, point[1]! * size + offset, 10, 0, Math.PI * 2);
    ctx.fill();
}

function drawLine(p1: Vec2, p2: Vec2, style: string) {
    ctx.beginPath();
    ctx.strokeStyle = style;

    ctx.moveTo(p1[0]! * size + offset, p1[1]! * size + offset);
    ctx.lineTo(p2[0]! * size + offset, p2[1]! * size + offset);

    ctx.stroke();
}