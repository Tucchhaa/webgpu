import { mat4, quat, vec3 } from "wgpu-matrix";
import { CameraComponent, WorldTransform } from "./core/components";
import { ResourceLoader } from "./core/loader";
import { SpaceEntity } from "./core/space-entity";
import { Input } from "./core/input/input";

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

window.addEventListener('load', main);

const CURVE_SIZE = 12;
const SEGMENT_SIZE = 6;
const SEGMENTS_PER_CURVE = 100;
const RESULT_BYTELENGTH_PER_CURVE = SEGMENTS_PER_CURVE * SEGMENT_SIZE * Float32Array.BYTES_PER_ELEMENT;

const HORIZONTAL_GRID_SIZE = { x: 20, z: 20 }; // X, Z
const HORIZONTAL_GRID_CELL_WIDTH = 7.5;
const HORIZONTAL_GRID_BYTELENGTH = (HORIZONTAL_GRID_SIZE.x + HORIZONTAL_GRID_SIZE.z + 2) * SEGMENT_SIZE * Float32Array.BYTES_PER_ELEMENT;

const cameraComponent = new CameraComponent({
    screenHeight: 800, screenWidth: 800,
    far: 800
});

const camera = new SpaceEntity({
    transform: {
        position: vec3.fromValues(0, 5, 0),
    },
    components: [cameraComponent]
})

async function main() {
    const { device, ctx, textureFormat } = await init();

    const computePipeline = await createComputePipeline();
    const renderPipeline = await createRenderPipeline();

    const horizontalGrid = createHorizontalGrid();

    let curves = new Float32Array([
        -7.5, 7.5, -20, // pivot1
        -7.5, 10, -20, // derivative1
        0, 5, -20, // derivative 2
        0, 7.5, -20, // pivot2

        0, 7.5, -20, // pivot3
        0, 10, -20, // derivative 3
        5, 7, -30, // derivative4
        5, 5, -30, // pivot4
    ]);

	const speed = 0.1;
	const angleSpeed = 0.02;

	const frame = async () => {		
        const segments = await computeSegments(curves);

        renderSegments(segments);

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

    async function createRenderPipeline() {
        const vertexLayout: GPUVertexBufferLayout = {
            arrayStride: 3 * 4, // xyz
            attributes: [
                {
                    format: "float32x3",
                    offset: 0,
                    shaderLocation: 0,
                },
            ],
        }

        const shaderModule = device.createShaderModule({
            label: "Base vertex/fragment shader",
            code: await ResourceLoader.loadShader('bezier-curve')
        });

        const pipelineDescriptor: GPURenderPipelineDescriptor = {
            label: "Base render pipeline",
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: "vertexMain",
                buffers: [vertexLayout]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragmentMain",
                targets: [{
                    format: textureFormat
                }]
            },
            primitive: {
                topology: 'line-list',
            },
        };

        const renderPipeline = await device.createRenderPipelineAsync(pipelineDescriptor);

        return renderPipeline;
    }

    async function createComputePipeline() {
        const shaderModule = device.createShaderModule({
            label: 'my compute shader',
            code: await ResourceLoader.loadShader('bezier-curve-compute')
        });
        
        const computePipeline = await device.createComputePipelineAsync({
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: 'computeMain',
                constants: {
                    SEGMENTS_PER_CURVE: SEGMENTS_PER_CURVE
                }
            }
        });

        return computePipeline;
    }

    function createHorizontalGrid(): Float32Array {
        const grid = [];

        const { x: x_size, z: z_size } = HORIZONTAL_GRID_SIZE;
        const xGridWidth = x_size * HORIZONTAL_GRID_CELL_WIDTH;
        const zGridWidth = z_size * HORIZONTAL_GRID_CELL_WIDTH;
        const cellWidth = HORIZONTAL_GRID_CELL_WIDTH;

        const xFrom = -Math.floor(x_size / 2);
        const xTo = x_size / 2;

        const zFrom = -Math.floor(z_size / 2);
        const zTo = z_size / 2;

        for(let i = xFrom; i <= xTo; i++) {
            grid.push(i * cellWidth, 0,  zGridWidth / 2);
            grid.push(i * cellWidth, 0, -zGridWidth / 2);

        }

        for(let i = zFrom; i <= zTo; i++) {
            grid.push( xGridWidth / 2 , 0, i * cellWidth);
            grid.push(-xGridWidth / 2,  0, i * cellWidth);
        }

        return new Float32Array(grid);
    }

    async function computeSegments(curves: Float32Array) {
        const curvesNumber = curves.length / CURVE_SIZE;
        const resultBytelength = curvesNumber * RESULT_BYTELENGTH_PER_CURVE;

        const curvesBuffer = device.createBuffer({
            label: 'dots buffer',
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
            size: curves.byteLength
        });
    
        const resultBuffer = device.createBuffer({
            label: 'result buffer',
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            size: resultBytelength
        });
    
        const outputBuffer = device.createBuffer({
            label: 'output buffer',
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            size: resultBytelength
        });
    
        const bindGroup = device.createBindGroup({
            layout: computePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: curvesBuffer } },
                { binding: 1, resource: { buffer: resultBuffer } }
            ]
        });
    
        device.queue.writeBuffer(curvesBuffer, 0, curves);
    
        const encoder = device.createCommandEncoder();
    
        const pass = encoder.beginComputePass();
    
        pass.setPipeline(computePipeline);
        pass.setBindGroup(0, bindGroup);

        pass.dispatchWorkgroups(curvesNumber, 1, 1);
    
        pass.end();
    
        encoder.copyBufferToBuffer(resultBuffer, 0, outputBuffer, 0, resultBytelength);
    
        device.queue.submit([encoder.finish()]);
    
        await outputBuffer.mapAsync(GPUMapMode.READ);

        const segments = new Float32Array(outputBuffer.getMappedRange());

        return segments;
    }

    function renderSegments(segments: Float32Array) {
        const segmentsBuffer = device.createBuffer({
            label: 'segments buffer',
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            size: segments.byteLength
        });
        device.queue.writeBuffer(segmentsBuffer, 0, segments);

        const gridBuffer = device.createBuffer({
            label: 'grid buffer',
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            size: HORIZONTAL_GRID_BYTELENGTH
        });
        device.queue.writeBuffer(gridBuffer, 0, horizontalGrid);

        const viewProjectionMatrixBuffer = device.createBuffer({
            label: "Camera uniform buffer",
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            size: 4 * 4 * 4
        });

        device.queue.writeBuffer(viewProjectionMatrixBuffer, 0, cameraComponent.getViewProjectionMatrix() as Float32Array);

        const bindGroup = device.createBindGroup({
            layout: renderPipeline.getBindGroupLayout(0),
            entries: [{
                binding: 0, resource: { buffer: viewProjectionMatrixBuffer }
            }]
        });

        // ===

        const encoder = device.createCommandEncoder();

        const renderPass = encoder.beginRenderPass({
            colorAttachments: [{
                clearValue: [200/255, 200/255, 200/255, 1],
                view: ctx.getCurrentTexture().createView(),
                loadOp: "clear",
                storeOp: "store",
            }],
        });

        renderPass.setPipeline(renderPipeline);
        renderPass.setBindGroup(0, bindGroup);

        renderPass.setVertexBuffer(0, gridBuffer);
        renderPass.draw(horizontalGrid.length / 3);
        
        renderPass.setVertexBuffer(0, segmentsBuffer);
        renderPass.draw(segments.length / 3);

        renderPass.end();

        device.queue.submit([encoder.finish()]);
    }
}

async function getWebGPUAdapter(): Promise<GPUAdapter> {
	if (!navigator.gpu)
		throw Error('WebGPU not supported.');

	const adapter = await navigator.gpu.requestAdapter();

	if (!adapter)
		throw Error('Couldn\'t request WebGPU adapter.');

    return adapter;
}

async function init(): Promise<{ device: GPUDevice, ctx: GPUCanvasContext, textureFormat: GPUTextureFormat }> {
    updateDimensions();
    new ResizeObserver(updateDimensions).observe(canvas);

    const adapter = await getWebGPUAdapter();
    const device = await adapter.requestDevice();

    const textureFormat = navigator.gpu.getPreferredCanvasFormat();
    const ctx = canvas.getContext('webgpu')!;

    ctx.configure({
        device,
        format: textureFormat,
        alphaMode: 'premultiplied'
    });

    Input.init();

    return { device, ctx, textureFormat };
}

function updateDimensions() {
    const screenHeight = canvas.offsetHeight * 2;
    const screenWidth = canvas.offsetWidth * 2;

    canvas.height = screenHeight;
    canvas.width = screenWidth;

    cameraComponent.setScreenSizes(screenWidth, screenHeight);
}
