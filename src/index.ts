import { CameraComponent, MeshComponent, WorldTransform } from "./core/components";
import { Input } from "./core/input/input";
import { quat, vec3 } from "wgpu-matrix";
import { Material } from "./core/material";
import { Renderer } from "./core/renderer";
import { SpaceEntity } from "./core/space-entity";
import { Scene } from "./core/scene/scene";

/*
TODO:
1. lights
2. OBJ format
*/

// xyz, uv, normal
const cubeVertices = new Float32Array([
	1, -1, 1,   0, 1,  0, -1, 0,
	-1, -1, 1,  1, 1,  0, -1, 0,
	-1, -1, -1, 1, 0,  0, -1, 0,
	1, -1, -1,  0, 0,  0, -1, 0,
	1, -1, 1,   0, 1,  0, -1, 0,
	-1, -1, -1, 1, 0,  0, -1, 0,
  
	1, 1, 1,    0, 1,  1, 0, 0,
	1, -1, 1,   1, 1,  1, 0, 0,
	1, -1, -1,  1, 0,  1, 0, 0, 
	1, 1, -1,   0, 0,  1, 0, 0, 
	1, 1, 1,    0, 1,  1, 0, 0, 
	1, -1, -1,  1, 0,  1, 0, 0, 
  
	-1, 1, 1,   0, 1,  0, 1, 0,
	1, 1, 1,    1, 1,  0, 1, 0,
	1, 1, -1,   1, 0,  0, 1, 0,
	-1, 1, -1,  0, 0,  0, 1, 0,
	-1, 1, 1,   0, 1,  0, 1, 0,
	1, 1, -1,   1, 0,  0, 1, 0,
  
	-1, -1, 1,  0, 1,  -1, 0, 0,
	-1, 1, 1,   1, 1,  -1, 0, 0,
	-1, 1, -1,  1, 0,  -1, 0, 0,
	-1, -1, -1, 0, 0,  -1, 0, 0,
	-1, -1, 1,  0, 1,  -1, 0, 0,
	-1, 1, -1,  1, 0,  -1, 0, 0,
  
	1, 1, 1,    0, 1,  0, 0, 1,
	-1, 1, 1,   1, 1,  0, 0, 1,
	-1, -1, 1,  1, 0,  0, 0, 1,
	-1, -1, 1,  1, 0,  0, 0, 1,
	1, -1, 1,   0, 0,  0, 0, 1,
	1, 1, 1,    0, 1,  0, 0, 1,
  
	1, -1, -1,  0, 1,  0, 0, -1,
	-1, -1, -1, 1, 1,  0, 0, -1,
	-1, 1, -1,  1, 0,  0, 0, -1,
	1, 1, -1,   0, 0,  0, 0, -1,
	1, -1, -1,  0, 1,  0, 0, -1,
	-1, 1, -1,  1, 0,  0, 0, -1,
]);

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

window.addEventListener('load', main);

async function main() {
	Input.init();

	const screenHeight = canvas.offsetHeight * 2;
	const screenWidth = canvas.offsetWidth * 2;

	canvas.height = screenHeight;
	canvas.width = screenWidth;

	const adapter = await getWebGPUAdapter();
	const device = await adapter.requestDevice();

	device.lost.then((info) => {
		console.error('Device lost: ', info);

		alert('device lost, check the console');
	})

	const renderer = await Renderer.create(canvas, device);

	const scene = new Scene();

	const camera = new SpaceEntity({
		transform: {
			position: vec3.fromValues(0, 0, 0),
		}
	});

	const cameraComponent = new CameraComponent({
		screenHeight, screenWidth,
	});

	camera.addComponent(cameraComponent);
	
	const res = await fetch('src/resources/chess-texture.jpeg');
	const img = await res.blob();
	const bitmap = await createImageBitmap(img);

	const vertices1 = new Float32Array(cubeVertices.length);
	const vertices2 = new Float32Array(cubeVertices.length);

	vertices1.set(cubeVertices);
	vertices2.set(cubeVertices);

	const chessBoardMaterial1 = new Material({ textureBitmap: bitmap, samplerMagFilter: 'linear', samplerMinFilter: 'linear' });
	const chessBoardMaterial2 = new Material({ textureBitmap: bitmap, samplerMagFilter: 'linear', samplerMinFilter: 'linear' });

	const mesh1 = new MeshComponent(vertices1, chessBoardMaterial1);
	const mesh2 = new MeshComponent(vertices2, chessBoardMaterial2);

	const cube1 = new SpaceEntity({
		transform: {
			scale: vec3.fromValues(1, 1, 1),
			position: vec3.fromValues(20, 10, -40),
			rotation: quat.fromAxisAngle(vec3.create(0, 1, 0), Math.PI)
		},
		components: [mesh1]
	});

	const cube2 = new SpaceEntity({
		transform: {
			scale: vec3.fromValues(1, 2, 1),
			position: vec3.fromValues(0, 0, -40),
			rotation: quat.fromAxisAngle(vec3.create(0, 1, 0), Math.PI * 45/180)
		},
		components: [mesh2]
	});

	scene.mainCamera = cameraComponent;
	scene.addSpaceEntity(cube1);
	scene.addSpaceEntity(cube2);

	await renderer.render(scene);

	const speed = 0.2;
	const angleSpeed = 0.01;

	const frame = async () => {		
		await renderer.render(scene);

		cube2.rotate(quat.fromEuler(0.01, 0, 0 , "xyz"), WorldTransform);

		// cube.scaleBy(vec3.fromValues(1.0003, 1.0003, 1.0003))
		// cube2.translate(vec3.fromValues(0, 0, 0.1), cube1.transform);

		if(Input.isShiftPressed) {
			const horRotation = quat.fromEuler(0, Input.axisHorizontal * angleSpeed, 0, 'xyz');
			const verRotation = quat.fromEuler(Input.axisVertical * angleSpeed, 0, 0, 'xyz');

			camera.rotate(horRotation);
			camera.rotate(verRotation, WorldTransform);

		} else {
			camera.translate(vec3.mulScalar(Input.axisVec3, speed));
		}

		requestAnimationFrame(frame);
	}
	frame();

	const resizeObserver = new ResizeObserver((entries) => {
		const screenHeight = canvas.offsetHeight * 2;
		const screenWidth = canvas.offsetWidth * 2;

		canvas.height = screenHeight;
		canvas.width = screenWidth;

		renderer.onScreenResized();
		cameraComponent.setScreenSizes(screenWidth, screenHeight);
	});

	resizeObserver.observe(canvas);
}

async function getWebGPUAdapter(): Promise<GPUAdapter> {
	if (!navigator.gpu)
		throw Error('WebGPU not supported.');

	const adapter = await navigator.gpu.requestAdapter();

	if (!adapter)
		throw Error('Couldn\'t request WebGPU adapter.');

	return adapter;
}