import { MeshComponent } from "../components";
import { STRIDE_BYTELENGTH, UV_COORD_BYTELENGTH, VERTEX_COORD_BYTELENGTH } from "./const";

interface VertexInfo {
    mesh: MeshComponent;

    vertexBuffer: GPUBuffer;
}

export class WebGPURendererVertexManager {
    private device: GPUDevice;

    public vertexLayout: GPUVertexBufferLayout;

    private meshVertexInfo: { [id: number]: VertexInfo };
    
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

        this.meshVertexInfo = {};
    }

    private createVertexBuffer(mesh: MeshComponent): VertexInfo {
        const vertexBuffer = this.device.createBuffer({
            size: mesh.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });

        this.device.queue.writeBuffer(vertexBuffer, 0, mesh.vertices);

        return { mesh, vertexBuffer };
    }

    public getVertexBuffer(mesh: MeshComponent): GPUBuffer {
        if(!this.meshVertexInfo[mesh.ID]) {
            this.meshVertexInfo[mesh.ID] = this.createVertexBuffer(mesh);
        }

        return this.meshVertexInfo[mesh.ID]!.vertexBuffer;
    }
}