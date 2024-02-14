import { ResourceLoader } from "./core/loader";

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

window.addEventListener('load', main);

async function main() {
    const { device, ctx, textureFormat } = await init();

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage"
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage'
                }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'storage'
                }
            }
        ]
    });

    const firstMatrix = new Float32Array([
        2 /* rows */, 4 /* columns */,
        1, 2, 3, 4,
        5, 6, 7, 8
    ]);

    const firstBuffer = device.createBuffer({
        size: firstMatrix.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(firstBuffer, 0, firstMatrix);

    // Second Matrix
    const secondMatrix = new Float32Array([
        4 /* rows */, 2 /* columns */,
        1, 2,
        3, 4,
        5, 6,
        7, 8
    ]);

    const secondBuffer = device.createBuffer({
        size: secondMatrix.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(secondBuffer, 0, secondMatrix);

    // Result Matrix
    const resultMatrixSize = Float32Array.BYTES_PER_ELEMENT * (2 + firstMatrix[0]! * secondMatrix[1]!);
    const resultBuffer = device.createBuffer({
        size: resultMatrixSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    const shaderModule = device.createShaderModule({
        label: 'My compute shader',
        code: await ResourceLoader.loadShader('compute-shader')
    });

    const computePipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        }),
        compute: {
            module: shaderModule,
            entryPoint: 'main'
        }
    });

    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: firstBuffer } },
            { binding: 1, resource: { buffer: secondBuffer } },
            { binding: 2, resource: { buffer: resultBuffer } },
        ]
    });

    const encoder = device.createCommandEncoder();

    const computePass = encoder.beginComputePass();

    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, bindGroup);

    const workgroupCountX = Math.ceil(firstMatrix[0]! / 8);
    const workgroupCountY = Math.ceil(secondMatrix[1]! / 8)

    computePass.dispatchWorkgroups(workgroupCountX, workgroupCountY);

    computePass.end();

    const outputBuffer = device.createBuffer({
        size: resultMatrixSize,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    encoder.copyBufferToBuffer(resultBuffer, 0, outputBuffer, 0, resultMatrixSize);

    device.queue.submit([encoder.finish()]);

    await outputBuffer.mapAsync(GPUMapMode.READ);
    console.log(new Float32Array(outputBuffer.getMappedRange()));
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
