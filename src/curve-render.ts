import { ResourceLoader } from "./core/loader";

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

window.addEventListener('load', main);

const CURVE_SIZE = 12;
const SEGMENT_SIZE = 6;
const SEGMENTS_PER_CURVE = 100;
const RESULT_BYTELENGTH_PER_CURVE = SEGMENTS_PER_CURVE * SEGMENT_SIZE * Float32Array.BYTES_PER_ELEMENT;

async function main() {
    const { device, ctx, textureFormat } = await init();

    const computePipeline = await createComputePipeline();
    const renderPipeline = await createRenderPipeline();

    let curves = new Float32Array([
        -.75, .75, 0, // pivot1
        -.75, 1, 0, // derivative1
        0, .5, 0, // derivative 2
        0, .75, 0, // pivot2

        0, .75, 0, // pivot3
        0, 1, 0, // derivative 3
        .5, .7, 0, // derivative4
        .5, .5, 0, // pivot4
    ]);

    const segments = await computeSegments(curves);

    renderSegments(segments);

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
        const vertexNumber = segments.length / 3;

        const encoder = device.createCommandEncoder();

        const renderPass = encoder.beginRenderPass({
            colorAttachments: [{
                clearValue: [37/255, 0/255, 69/255, 1],
                view: ctx.getCurrentTexture().createView(),
                loadOp: "clear",
                storeOp: "store",
            }],
        });

        renderPass.setPipeline(renderPipeline);

        const vertexBuffer = device.createBuffer({
            label: 'vertex buffer',
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            size: segments.byteLength
        });

        device.queue.writeBuffer(vertexBuffer, 0, segments);

        renderPass.setVertexBuffer(0, vertexBuffer);

        renderPass.draw(vertexNumber);

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
    const screenHeight = canvas.offsetHeight * 2;
    const screenWidth = canvas.offsetWidth * 2;

    canvas.height = screenHeight;
    canvas.width = screenWidth;

    const adapter = await getWebGPUAdapter();
    const device = await adapter.requestDevice();

    const textureFormat = navigator.gpu.getPreferredCanvasFormat();
    const ctx = canvas.getContext('webgpu')!;

    ctx.configure({
        device,
        format: textureFormat,
        alphaMode: 'premultiplied'
    });

    return { device, ctx, textureFormat };
}
