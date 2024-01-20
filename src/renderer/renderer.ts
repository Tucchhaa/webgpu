import { Object3D } from "../entity";
import { loadShader } from "../helpers/load";
import { EventPipeline } from "../core/middleware";
import { WebGPURendererVertexManager as RendererVertexManager } from "./vertex-manager";
import { BindGroupsManager } from "./bindgroups-manager";
import { CAMERA_BINDGROUP_INDEX, DEPTH_TEXTURE_FORMAT, OBJECT_BINDGROUP_INDEX as OBJECT_BINDGROUP_INDEX } from "./const";
import { CameraComponent } from "../entity/components/camera-component";

class RendererEvents {
    public prepareRenderPass: EventPipeline<{ pass: GPURenderPassEncoder, gameObjects: Object3D[] }> = new EventPipeline();
}

export class Renderer {
    // === Base properties
	private device: GPUDevice;

	private ctx: GPUCanvasContext;

    private canvas: HTMLCanvasElement;

    private events: RendererEvents;

    // === Pipeline properties

    private textureFormat: GPUTextureFormat;

    private depthTextureFormat: GPUTextureFormat;

    private renderPipeline!: GPURenderPipeline;

    private depthTexture: GPUTexture;
    
    // === Managers
    private vertexManager: RendererVertexManager;

    private bindGroupsManager: BindGroupsManager;

    private constructor(device: GPUDevice, ctx: GPUCanvasContext, textureFormat: GPUTextureFormat) {
        this.device = device;
        this.ctx = ctx;
        this.canvas = ctx.canvas as HTMLCanvasElement;
        this.events = new RendererEvents();
        
        this.textureFormat = textureFormat;
        this.depthTextureFormat = DEPTH_TEXTURE_FORMAT;

        this.depthTexture = this.createDepthTexture(this.canvas);

        this.vertexManager = new RendererVertexManager(device);
        this.bindGroupsManager = new BindGroupsManager(device);
    }

    // ===
    // Instanciation
    // ===
    public static async create(canvas: HTMLCanvasElement, device: GPUDevice): Promise<Renderer> {
        const textureFormat = navigator.gpu.getPreferredCanvasFormat();
        const ctx = canvas.getContext('webgpu')!;

		ctx.configure({
			device,
			format: textureFormat,
            alphaMode: 'premultiplied'
		});

        const instance = new Renderer(device, ctx, textureFormat);

        await instance.init();

        return instance;
    }

    public onScreenResized() {
        this.depthTexture.destroy();
        this.depthTexture = this.createDepthTexture(this.ctx.canvas as HTMLCanvasElement);
    }

    private async init(): Promise<void> {
        this.initEventsMiddleware();

        await this.createRenderPipeline();
    }

    private initEventsMiddleware() {
        // this.events.prepareRenderPass
        //     .use(async({ pass }, next) => {
        //         pass.setPipeline(this.renderPipeline);
        //         pass.setBindGroup(0, this.cameraBindGroup);

        //         await next();

        //         pass.end();
        //     })
        //     .use(this.vertexManager.handlePrepareRenderPassEvent.bind(this.vertexManager));
    }

    private async createRenderPipeline(): Promise<void> {
        const shaderModule = this.device.createShaderModule({
            label: "Base vertex/fragment shader",
            code: await loadShader('base')
        });

        const pipelineDescriptor: GPURenderPipelineDescriptor = {
            label: "Base render pipeline",
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: "vertexMain",
                buffers: [this.vertexManager.vertexLayout]
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
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        };

        this.renderPipeline = await this.device.createRenderPipelineAsync(pipelineDescriptor);
    }

    private createDepthTexture(canvas: HTMLCanvasElement): GPUTexture {
        return this.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: this.depthTextureFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }

    // ===

    async render(camera: CameraComponent, objects3d: Object3D[]): Promise<void> {
        const cameraBindGroup = this.bindGroupsManager.getCameraBindGroup(camera, this.renderPipeline);

        const encoder = this.device.createCommandEncoder();

        const renderPass = encoder.beginRenderPass({
            colorAttachments: [{
                clearValue: [1, 1, 1, 1],
                view: this.ctx.getCurrentTexture().createView(),
                loadOp: "clear",
                storeOp: "store",
            }],
            depthStencilAttachment: {
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
                view: this.depthTexture.createView()
            }
        });

        renderPass.setPipeline(this.renderPipeline);
        renderPass.setBindGroup(CAMERA_BINDGROUP_INDEX, cameraBindGroup);

        let totalInstanceCount = 0;

        for(const object3d of objects3d) {
            const { mesh } = object3d;

            const objectBindGroup = this.bindGroupsManager.getObjectBindGroup(object3d, this.renderPipeline);

            renderPass.setBindGroup(OBJECT_BINDGROUP_INDEX, objectBindGroup);

            renderPass.setVertexBuffer(0, this.vertexManager.getVertexBuffer(object3d));

            renderPass.draw(mesh.polygonsCount, 1, 0, totalInstanceCount);

            totalInstanceCount++;
        }

        renderPass.end();
    
        this.device.queue.submit([encoder.finish()]);
    }
}
