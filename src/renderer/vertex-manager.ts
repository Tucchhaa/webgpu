import { Object3D } from "../entity";
import { STRIDE_BYTELENGTH, UV_COORD_BYTELENGTH, VERTEX_COORD_BYTELENGTH } from "./const";

interface VertexInfo {
    object3d: Object3D;

    vertexBuffer: GPUBuffer;
}

export class WebGPURendererVertexManager {
    private device: GPUDevice;

    public vertexLayout: GPUVertexBufferLayout;

    private objectsVertexInfo: { [id: number]: VertexInfo };
    
    constructor(device: GPUDevice) {
        this.device = device;

        this.vertexLayout = {
            arrayStride: STRIDE_BYTELENGTH,
            attributes: [
                {
                    format: "float32x3",
                    offset: 0,
                    shaderLocation: 0,
                },
                {
                    format: 'float32x2',
                    offset: VERTEX_COORD_BYTELENGTH,
                    shaderLocation: 1,
                },
                {
                    format: 'float32x3',
                    offset: VERTEX_COORD_BYTELENGTH + UV_COORD_BYTELENGTH,
                    shaderLocation: 2,
                }
            ],
        };

        this.objectsVertexInfo = {};
    }

    private createVertexBuffer(object3d: Object3D) {
        const vertexBuffer = this.device.createBuffer({
            size: object3d.mesh.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });

        this.device.queue.writeBuffer(vertexBuffer, 0, object3d.mesh.vertices);

        return { object3d, vertexBuffer };
    }

    public getVertexBuffer(object3d: Object3D): GPUBuffer {
        if(!this.objectsVertexInfo[object3d.ID]) {
            this.objectsVertexInfo[object3d.ID] = this.createVertexBuffer(object3d);
        }

        return this.objectsVertexInfo[object3d.ID]!.vertexBuffer;
    }

    async handlePrepareRenderPassEvent({ pass, gameObjects }: { pass: GPURenderPassEncoder, gameObjects: Object3D[] }, next: () => Promise<void>): Promise<void> {
        // const vertices: number[] = [];
        
        // gameObjects.map(gameObject => vertices.push(...gameObject.mesh.vertices));

        // const verticesTypedArray = new Float32Array(vertices);

        // const vertexBuffer = this.device.createBuffer({
        //     label: "Cube vertices",
        //     size: verticesTypedArray.byteLength,
        //     usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        // });

        // this.device.queue.writeBuffer(vertexBuffer, 0, verticesTypedArray);

        // pass.setVertexBuffer(0, vertexBuffer);

        // await next();

        // pass.draw(Math.ceil(vertices.length / 4));
    }
}