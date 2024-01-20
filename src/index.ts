import { Input } from "./core/input";
import { Object3D, Mesh, Material } from "./entity";
import { CameraComponent } from "./entity/components/camera-component";
import { SpaceEntity } from "./entity/space-entity";
import { Renderer } from "./renderer";
import { quat, vec3 } from "wgpu-matrix";

/*
TODO:
1. translation of objects is relative to its scale
2. lights
3. camera person-like movement
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

	const camera = new SpaceEntity({
		transform: {
			position: vec3.fromValues(0, 0, 0),
		}
	});

	const cameraComponent = new CameraComponent({
		screenHeight, screenWidth,
	});

	camera.addComponent(cameraComponent);

	let rot = quat.create(0,0,0,1);
	
	rot = quat.rotateY(rot, -0.78)
	
	const res = await fetch('src/chess-texture.jpeg');
	const img = await res.blob();
	const bitmap = await createImageBitmap(img);

	const cube1 = new Object3D({
		mesh: new Mesh(cubeVertices),
		material: new Material({ textureBitmap: bitmap, samplerMagFilter: 'linear', samplerMinFilter: 'linear' }),
		transform: {
			scale: vec3.fromValues(1, 1, 1),
			position: vec3.fromValues(20, 10, -40)
		}
	});

	const cube = new Object3D({
		mesh: new Mesh(cubeVertices),
		material: new Material({ textureBitmap: bitmap, samplerMagFilter: 'linear', samplerMinFilter: 'linear' }),
		// rotation: rot,
		transform: {
			scale: vec3.fromValues(1, 2, 1),
			position: vec3.fromValues(0, 0, -40)
		}
	});


	await renderer.render(cameraComponent, [cube, cube1]);

	const speed = 0.2;
	const angleSpeed = 0.01;

	const frame = async () => {		
		await renderer.render(cameraComponent, [cube, cube1]);

		cube.rotate(quat.fromEuler(0.01, 0, 0 , "xyz"));

		// cube.scaleBy(vec3.fromValues(1.0003, 1.0003, 1.0003))
		// cube.translate(vec3.fromValues(0, 0, -0.1));

		if(Input.isShiftPressed) {
			const rotation = quat.fromEuler(Input.axisVertical * angleSpeed, Input.axisHorizontal * angleSpeed, 0, 'xyz');

			camera.rotate(rotation);
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