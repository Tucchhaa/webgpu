import { loadShader } from "./helpers/load";
import { EventPipeline } from "./core/middleware";
import { vec3, mat4, Mat4, vec4, Vec3 } from 'wgpu-matrix';

const TRANSOFRMATION_MATRIX_BYTE_LENGTH = 16 * 4; // 16 items, each 4 bytes

interface GameEngineEvents {
    on(event: 'prepare-render-pass'): EventPipeline<any>;
}

const cubeVertices = [
  // float4 position, float4 color, float2 uv,
  1, -1, 1, 1,   1, 0, 1, 1,  0, 1,
  -1, -1, 1, 1,  0, 0, 1, 1,  1, 1,
  -1, -1, -1, 1, 0, 0, 0, 1,  1, 0,
  1, -1, -1, 1,  1, 0, 0, 1,  0, 0,
  1, -1, 1, 1,   1, 0, 1, 1,  0, 1,
  -1, -1, -1, 1, 0, 0, 0, 1,  1, 0,

  1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
  1, -1, 1, 1,   1, 0, 1, 1,  1, 1,
  1, -1, -1, 1,  1, 0, 0, 1,  1, 0,
  1, 1, -1, 1,   1, 1, 0, 1,  0, 0,
  1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
  1, -1, -1, 1,  1, 0, 0, 1,  1, 0,

  -1, 1, 1, 1,   0, 1, 1, 1,  0, 1,
  1, 1, 1, 1,    1, 1, 1, 1,  1, 1,
  1, 1, -1, 1,   1, 1, 0, 1,  1, 0,
  -1, 1, -1, 1,  0, 1, 0, 1,  0, 0,
  -1, 1, 1, 1,   0, 1, 1, 1,  0, 1,
  1, 1, -1, 1,   1, 1, 0, 1,  1, 0,

  -1, -1, 1, 1,  0, 0, 1, 1,  0, 1,
  -1, 1, 1, 1,   0, 1, 1, 1,  1, 1,
  -1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
  -1, -1, -1, 1, 0, 0, 0, 1,  0, 0,
  -1, -1, 1, 1,  0, 0, 1, 1,  0, 1,
  -1, 1, -1, 1,  0, 1, 0, 1,  1, 0,

  1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
  -1, 1, 1, 1,   0, 1, 1, 1,  1, 1,
  -1, -1, 1, 1,  0, 0, 1, 1,  1, 0,
  -1, -1, 1, 1,  0, 0, 1, 1,  1, 0,
  1, -1, 1, 1,   1, 0, 1, 1,  0, 0,
  1, 1, 1, 1,    1, 1, 1, 1,  0, 1,

  1, -1, -1, 1,  1, 0, 0, 1,  0, 1,
  -1, -1, -1, 1, 0, 0, 0, 1,  1, 1,
  -1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
  1, 1, -1, 1,   1, 1, 0, 1,  0, 0,
  1, -1, -1, 1,  1, 0, 0, 1,  0, 1,
  -1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
];


class ResourceLoader {

}



export class GameEngine implements GameEngineEvents {
    private canvas!: HTMLCanvasElement;

	private ctx!: GPUCanvasContext;

	private device!: GPUDevice;

    private textureFormat!: GPUTextureFormat;

    private renderPipeline!: GPURenderPipeline;

    private vertexBuffer!: GPUBuffer;

    private transformationMatrixBuffer!: GPUBuffer;

    private uniformBindGroup!: GPUBindGroup;

	async init(canvas: HTMLCanvasElement) {
		const adapter = await this.getWebGPUAdapter();
		
        this.canvas = canvas;
		this.ctx = canvas.getContext('webgpu')!;

        this.device = await adapter.requestDevice();
        this.textureFormat = navigator.gpu.getPreferredCanvasFormat();

		this.ctx.configure({
			device: this.device,
			format: this.textureFormat,
		});

        this.updateDimensions();
        addEventListener('resize', this.updateDimensions);

        await this.configureRenderPipeline();

        await this.createUniformBindGroup();
    }

    updateDimensions() {
		this.canvas.width = this.canvas.offsetWidth * 2;
		this.canvas.height = this.canvas.offsetHeight * 2;
	}

	private async getWebGPUAdapter(): Promise<GPUAdapter> {
		if (!navigator.gpu)
			throw Error('WebGPU not supported.');

        const adapter = await navigator.gpu.requestAdapter();

		if (!adapter)
			throw Error('Couldn\'t request WebGPU adapter.');

		return adapter;
	}

    private async configureRenderPipeline(): Promise<void> {
        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 16 + 16 + 8, // pos (3*4) + color (4*4) + uv (2*4)
            attributes: [
                {
                    format: "float32x4",
                    offset: 0,
                    shaderLocation: 0,
                },
                {
                    format: 'float32x4',
                    offset: 16,
                    shaderLocation: 1
                },
                {
                    format: 'float32x2',
                    offset: 32,
                    shaderLocation: 2
                }
            ],
        };

        const shaderModule = this.device.createShaderModule({
            label: "Base vertex/fragment shader",
            code: await loadShader('cube')
        });

        const pipelineDescriptor: GPURenderPipelineDescriptor = {
            label: "Base render pipeline",
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: "vertexMain",
                buffers: [vertexBufferLayout]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragmentMain",
                targets: [{
                    format: this.textureFormat
                }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back'
            },
            // depthStencil: {
            //     depthWriteEnabled: true,
            //     depthCompare: 'less',
            //     format: 'depth24plus',
            // },
        };

        this.renderPipeline = await this.device.createRenderPipelineAsync(pipelineDescriptor);
    }

    async createUniformBindGroup(): Promise<void> {
        this.transformationMatrixBuffer = this.device.createBuffer({
            label: "Transformation matrix uniform buffer",
            size: TRANSOFRMATION_MATRIX_BYTE_LENGTH, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // ===
        const response = await fetch('src/chess-texture.jpeg');

        const imageBitmap = await createImageBitmap(await response.blob());

        const cubeTexture = this.device.createTexture({
            size: [imageBitmap.width, imageBitmap.height, 1],
            format: this.textureFormat,
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

        this.device.queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture: cubeTexture },
            [imageBitmap.width, imageBitmap.height]
        );

        // Create a sampler with linear filtering for smooth interpolation.
        const sampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
        });

        // ===

        this.uniformBindGroup = this.device.createBindGroup({
            label: "Base renderer bind group",
            layout: this.renderPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.transformationMatrixBuffer
                    }
                },
                {
                    binding: 1,
                    resource: sampler
                },
                {
                    binding: 2,
                    resource: cubeTexture.createView()
                }
            ]
        });
    }

    getTransformationMatrix(): Mat4 {
        const aspect = this.ctx.canvas.width / this.ctx.canvas.height;
        const projectionMatrix = mat4.perspective(
            (2 * Math.PI) / 5,
            aspect,
            1,
            100.0
        );

        const viewMatrix = mat4.identity();
        mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
        const now = Date.now() / 1000;
        mat4.rotate(
            viewMatrix,
            vec3.fromValues(Math.sin(now), Math.cos(now), 0),
            1,
            viewMatrix
        );
        mat4.scale(viewMatrix, vec4.fromValues(0.7, 0.7, 0.7, 0.7), viewMatrix);

        return mat4.multiply(projectionMatrix, viewMatrix);
    }

    updateUniformBuffer() {
        const transformationMatrix = this.getTransformationMatrix() as Float32Array;

        this.device.queue.writeBuffer(
            this.transformationMatrixBuffer, 0, transformationMatrix
        );
    }

    updateBuffers() {
        this.updateUniformBuffer();

        // Vertex buffer
        const vertices = new Float32Array(cubeVertices);

        this.vertexBuffer = this.device.createBuffer({
            label: "Cube vertices",
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        this.device.queue.writeBuffer(this.vertexBuffer, 0, vertices);
    }

    prepareRenderPassMiddleware: EventPipeline<any> = new EventPipeline();

    on(event: 'prepare-render-pass') {
        return this.prepareRenderPassMiddleware;
    }

    render() {
        this.updateBuffers();

        const encoder = this.device.createCommandEncoder();

        const depthTexture = this.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
          });

        const pass = encoder.beginRenderPass({
            colorAttachments: [{
               view: this.ctx.getCurrentTexture().createView(),
               loadOp: "clear",
               clearValue: { r: 0, g: 0, b: 0.4, a: 1 },
               storeOp: "store",
            }],
            // depthStencilAttachment: {
            //     view: depthTexture.createView(),
          
            //     depthClearValue: 1.0,
            //     depthLoadOp: 'clear',
            //     depthStoreOp: 'store',
            // },
        });

        pass.setPipeline(this.renderPipeline);
        pass.setBindGroup(0, this.uniformBindGroup);
        pass.setVertexBuffer(0, this.vertexBuffer);

        pass.draw(36);
        pass.end();
    
        this.device.queue.submit([encoder.finish()]);
    }
}
