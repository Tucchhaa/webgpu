import { Vec3, mat3, mat4, quat, vec3, vec4 } from "wgpu-matrix";
import { CameraComponent, WorldTransform } from "./core/components";
import { ResourceLoader } from "./core/loader";
import { SpaceEntity } from "./core/space-entity";
import { Input } from "./core/input/input";

type Curve = {
    p1: Vec3, s1: Vec3, p2: Vec3, s2: Vec3
};

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

window.addEventListener('load', main);

const CURVE_SIZE = 12; // amount of number to define a curve + padding
const SEGMENT_SIZE = 6; // number of vertexes to represent a segment
const PIVOT_SIZE = 12; // number of vertexes to represent a pivot
const VERTEX_SIZE = 4; // xyz + pad

const PIVOTS_PER_CURVE = 4;
const SEGMENTS_PER_CURVE = 100;

const HORIZONTAL_GRID_SIZE = { x: 20, z: 20 }; // X, Z
const HORIZONTAL_GRID_CELL_WIDTH = 7.5;
const HORIZONTAL_GRID_THICKNESS = 0.1;

const renderOptions = {
    grid: {
        x: 20,
        z: 20,

        cellWidth: 7.5,
        thickness: 0.1
    },
    curveThickness: 0.1
};

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

    let curves: Curve[] = [{
        p1: vec3.create(-7.5, 7.5, -20),
        s1: vec3.create(-7.5, 10, -20),
        s2: vec3.create(0, 5, -20),
        p2: vec3.create(0, 7.5, -20),
    }, {
        p1: vec3.create(5, 5, -30),
        s1: vec3.create(5, 3, -30),
        s2: vec3.create(-7.5, 1, -30),
        p2: vec3.create(-7.5, 7.5, -30), 
    }, {
        p1: vec3.create(0, 7.5, -20),
        s1: vec3.create(0, 10, -20),
        s2: vec3.create(5, 7, -30),
        p2: vec3.create(5, 5, -30),
    }];

	const speed = 0.3;
	const angleSpeed = 0.02;

	const frame = async () => {
        const segmentsVertexCount = curves.length * SEGMENTS_PER_CURVE * SEGMENT_SIZE;
        const pivotsVertexCount = curves.length * PIVOTS_PER_CURVE * PIVOT_SIZE;

        const segmentsBufferBytelength = segmentsVertexCount * VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT;
        const pivotsBufferBytelength = pivotsVertexCount * VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT;

        const curvesTypedArray = getCurvesTypedArray(curves);
        const { segmentsBuffer, pivotsBuffer } = await computeSegments(curvesTypedArray, segmentsBufferBytelength, pivotsBufferBytelength);

        render(segmentsBuffer, segmentsVertexCount, pivotsBuffer, pivotsVertexCount);

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
            arrayStride: 4 * 4, // xyz
            attributes: [
                {
                    format: "float32x4",
                    offset: 0,
                    shaderLocation: 0,
                }
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
                topology: 'triangle-list',
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
        const displace = HORIZONTAL_GRID_THICKNESS / 2;

        const xFrom = -Math.floor(x_size / 2);
        const xTo = x_size / 2;

        const zFrom = -Math.floor(z_size / 2);
        const zTo = z_size / 2;

        for(let i = xFrom; i <= xTo; i++) {
            const p1 = vec4.create(i * cellWidth + displace, 0,  zGridWidth / 2);
            const p2 = vec4.create(i * cellWidth - displace, 0,  zGridWidth / 2);
            const p3 = vec4.create(i * cellWidth + displace, 0, -zGridWidth / 2);
            const p4 = vec4.create(i * cellWidth - displace, 0, -zGridWidth / 2);

            grid.push(...p1, ...p3, ...p2, ...p4, ...p2, ...p3);
        }

        for(let i = zFrom; i <= zTo; i++) {
            const p1 = vec4.create( zGridWidth / 2, 0, i * cellWidth + displace);
            const p2 = vec4.create( zGridWidth / 2, 0, i * cellWidth - displace);
            const p3 = vec4.create(-zGridWidth / 2, 0, i * cellWidth + displace);
            const p4 = vec4.create(-zGridWidth / 2, 0, i * cellWidth - displace);

            grid.push(...p1, ...p3, ...p2, ...p4, ...p2, ...p3);
        }

        return new Float32Array(grid);
    }

    async function computeSegments(curves: Float32Array, segmentsResultBytelength: number, pivotsBufferBytelength: number) {
        const curvesNumber = curves.length / CURVE_SIZE;

        const optionsBuffer = device.createBuffer({
            label: 'compute options uniform buffer',
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            size: 1 * Float32Array.BYTES_PER_ELEMENT
        });
        const options = new Float32Array([renderOptions.curveThickness]);
        device.queue.writeBuffer(optionsBuffer, 0, options);

        const cameraPositionBuffer = device.createBuffer({
            label: "Camera uniform buffer",
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            size: 3 * 4
        });
        device.queue.writeBuffer(cameraPositionBuffer, 0, camera.position as Float32Array);

        const curvesBuffer = device.createBuffer({
            label: 'dots buffer',
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            size: curves.byteLength
        });
        device.queue.writeBuffer(curvesBuffer, 0, curves);
    
        const segmentsBuffer = device.createBuffer({
            label: 'segments result buffer',
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
            size: segmentsResultBytelength
        });

        const pivotsBuffer = device.createBuffer({
            label: 'pivots result buffer',
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
            size: pivotsBufferBytelength
        });
    
        const bindGroup = device.createBindGroup({
            layout: computePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: optionsBuffer } },
                { binding: 1, resource: { buffer: cameraPositionBuffer } },
                { binding: 2, resource: { buffer: curvesBuffer } },

                { binding: 3, resource: { buffer: segmentsBuffer } },
                { binding: 4, resource: { buffer: pivotsBuffer } },
            ]
        });
    
        const encoder = device.createCommandEncoder();
    
        const pass = encoder.beginComputePass();
    
        pass.setPipeline(computePipeline);
        pass.setBindGroup(0, bindGroup);

        pass.dispatchWorkgroups(curvesNumber, 1, 1);
    
        pass.end();
        
        device.queue.submit([encoder.finish()]);

        await device.queue.onSubmittedWorkDone();

        return { segmentsBuffer, pivotsBuffer };
    }

    function render(segmentBuffer: GPUBuffer, segmentVertexCount: number, pivotsBuffer: GPUBuffer, pivotsVertexCount: number) {
        const gridBuffer = device.createBuffer({
            label: 'grid buffer',
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            size: horizontalGrid.byteLength
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
        renderPass.draw(horizontalGrid.length / 4, undefined, undefined, 0);
        
        renderPass.setVertexBuffer(0, segmentBuffer);
        renderPass.draw(segmentVertexCount, undefined, undefined, 1);

        renderPass.setVertexBuffer(0, pivotsBuffer);
        renderPass.draw(pivotsVertexCount, undefined, undefined, 2);

        renderPass.end();

        device.queue.submit([encoder.finish()]);
    }

    function getCurvesTypedArray(curves: Curve[]) {
        const array = [];

        for(let i=0; i < curves.length; i++) {
            const curve = curves[i]!;
            array.push(
                ...curve.p1,
                ...curve.s1,
                ...curve.s2,
                ...curve.p2
            );
        }

        return new Float32Array(array);
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
