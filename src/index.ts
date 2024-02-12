// const canvas = document.getElementById('canvas') as HTMLCanvasElement;

// window.addEventListener('load', main);

// async function main() {
	
// }

import { CameraComponent, MeshComponent, WorldTransform } from "./core/components";
import { Input } from "./core/input/input";
import { quat, vec3 } from "wgpu-matrix";
import { Material } from "./core/material";
import { Renderer } from "./core/renderer";
import { SpaceEntity } from "./core/space-entity";
import { Scene } from "./core/scene/scene";
import { DirectLightComponent, PointLightComponent } from "./core/components/lights/light";
import { ResourceLoader } from "./core/loader";

/*
TODO:
1. spot light
2. OBJ format
3. Shadows
4. Anti-aliasing
5. ResourceLoader - Material
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
			position: vec3.fromValues(40, 20, 0),
		},
		components: [
			new CameraComponent({
				screenHeight, screenWidth,
				far: 800
			})
		]
	});

	const directLight1 = new SpaceEntity({
		transform: {
			rotation: quat.fromEuler(Math.PI / 180 * 30, Math.PI, 0, 'yxz')
		},
		components: [new DirectLightComponent({ color: vec3.create(255, 255, 255), intensity: 0.7 })]
	});
	
	const pointLight1 = new SpaceEntity({
		transform: {
			position: vec3.create(5, 10, -40),
		},
		components: [new PointLightComponent({ intensity: 1.2, range: 150, color: vec3.create(0, 0, 255), angle: Math.PI / 180 * 15 })]
	});

	const pointLight2 = new SpaceEntity({
		transform: {
			position: vec3.create(65, 10, -40),
			// position: vec3.create(16, 6.5, -36.5),
		},
		components: [new PointLightComponent({ intensity: 1.2, range: 300, color: vec3.create(255, 0, 0), angle: Math.PI / 180 * 160 })]
	});

	const res = await fetch('src/resources/chess-texture.jpeg');
	const img = await res.blob();
	const bitmap = await createImageBitmap(img);

	const vertices = new Float32Array(cubeVertices);
	const chessBoardMaterial = new Material({ textureBitmap: bitmap, samplerMagFilter: 'linear', samplerMinFilter: 'linear' });
	const floorMesh = new MeshComponent(vertices, chessBoardMaterial);

	const floor = new SpaceEntity({
		transform: {
			scale: vec3.fromValues(200, 1, 200),
			position: vec3.fromValues(0, -10, -40),
		},
		components: [floorMesh]
	});

	const jet = new SpaceEntity({
		transform: {
			position: vec3.fromValues(40, 0, -100)
		},
		components: [await ResourceLoader.loadMesh('jet/jet', 'src/resources/meshes/jet/jet.png')]
	});

	scene.mainCamera = camera.requireComponent(CameraComponent);
	scene.addSpaceEntity(floor);
	scene.addSpaceEntity(jet);
	scene.addSpaceEntity(directLight1);
	scene.addSpaceEntity(pointLight1);
	scene.addSpaceEntity(pointLight2);

	await renderer.render(scene);

	const speed = 0.6;
	const angleSpeed = 0.02;

	const frame = async () => {		
		await renderer.render(scene);

		if(Input.isShiftPressed) {
			const horRotation = quat.fromEuler(0, Input.axisHorizontal * angleSpeed, 0, 'xyz');
			const verRotation = quat.fromEuler(Input.axisVertical * angleSpeed, 0, 0, 'xyz');

			camera.rotate(horRotation);
			camera.rotate(verRotation, WorldTransform);
		} else {
			camera.translate(vec3.mulScalar(Input.axisVec3, speed));

			// pointLight1.position = camera.position;
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
		camera.getComponent(CameraComponent)!.setScreenSizes(screenWidth, screenHeight);
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
