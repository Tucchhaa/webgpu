import { mat3 } from "wgpu-matrix";
import { CAMERA_BINDGROUP_INDEX, OBJECT_BINDGROUP_INDEX, MATRIX_4x4_BYTELENGTH, MATRIX_3x4_BYTELENGTH } from "./const";
import { CameraComponent, MeshComponent } from "../components";
import { Material } from "../material";

interface SceneBindGroupInfo {
    camera: CameraComponent;

    bindGroup: GPUBindGroup;

    viewProjectionMatrixBuffer: GPUBuffer;
}

interface MeshBindGroupInfo {
    mesh: MeshComponent;

    bindGroup: GPUBindGroup;

    transformationMatrixBuffer: GPUBuffer;

    rotationMatrixBuffer: GPUBuffer;

    texture: GPUTexture;

    sampler: GPUSampler;
}

export class BindGroupsManager {
    private readonly cameraBindGroups: { [id: number]: SceneBindGroupInfo };
    
    private readonly objectBindGroups: { [id: number]: MeshBindGroupInfo };

    // ===

    private device: GPUDevice;

    private textureFormat: GPUTextureFormat;

    // ===
    
    constructor(device: GPUDevice) {
        this.cameraBindGroups = {};
        this.objectBindGroups = {};

        this.device = device;
        this.textureFormat = navigator.gpu.getPreferredCanvasFormat();
    }

    public getSceneBindGroup(camera: CameraComponent, pipeline: GPUPipelineBase): GPUBindGroup {
        let cameraBindGroup = this.cameraBindGroups[camera.ID];

        if(cameraBindGroup === undefined) {
            cameraBindGroup = this.createSceneBindGroup(camera, pipeline);
            this.cameraBindGroups[camera.ID] = cameraBindGroup;
        }

        this.updateSceneBuffer(cameraBindGroup);

        return cameraBindGroup.bindGroup;
    }

    public getMeshBindGroup(mesh: MeshComponent, pipeline: GPUPipelineBase): GPUBindGroup {
        let objectBindGroup = this.objectBindGroups[mesh.ID];

        if(objectBindGroup === undefined) {
            objectBindGroup = this.createMeshBindGroup(mesh, pipeline);
            this.objectBindGroups[mesh.ID] = objectBindGroup;
        }

        this.updateMeshBuffer(objectBindGroup);

        return objectBindGroup.bindGroup;
    }

    // ===
    // Camera
    // ===
    private createSceneBindGroup(camera: CameraComponent, pipeline: GPUPipelineBase): SceneBindGroupInfo {
        const viewProjectionMatrixBuffer = this.device.createBuffer({
            label: "Camera view-projection buffer",
            size: MATRIX_4x4_BYTELENGTH, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const directionalLightBuffer = this.device.createBuffer({
            label: 'Directional light buffer',
            size: 3 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(directionalLightBuffer, 0, new Float32Array([1, -1, -1]));

        const bindGroup = this.device.createBindGroup({
            label: "Camera view-projection bind group",
            layout: pipeline.getBindGroupLayout(CAMERA_BINDGROUP_INDEX),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: viewProjectionMatrixBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: directionalLightBuffer
                    }
                }
            ]
        });

        return { camera, bindGroup, viewProjectionMatrixBuffer };
    }

    private updateSceneBuffer(bindGroupInfo: SceneBindGroupInfo) {
        let data = bindGroupInfo.camera.getViewProjectionMatrix();

        this.device.queue.writeBuffer(
            bindGroupInfo.viewProjectionMatrixBuffer, 0, data as Float32Array
        );
    }


    // ===
    // Object 3D
    // ===

    private createMeshBindGroup(mesh: MeshComponent, pipeline: GPUPipelineBase): MeshBindGroupInfo {
        const { material } = mesh;

        const transformationMatrixBuffer = this.device.createBuffer({
            label: "object transformation buffer",
            size: MATRIX_4x4_BYTELENGTH, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const rotationMatrixBuffer = this.device.createBuffer({
            label: "rotation transformation buffer",
            size: MATRIX_3x4_BYTELENGTH, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const texture = this.createTexture(material);

        const sampler = this.device.createSampler({
            magFilter: material.samplerMagFilter,
            minFilter: material.samplerMinFilter
        });

        const bindGroup = this.device.createBindGroup({
            label: "object transformation bind group",
            layout: pipeline.getBindGroupLayout(OBJECT_BINDGROUP_INDEX),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: transformationMatrixBuffer
                    }
                },
                {
                    binding: 1,
                    resource: sampler,
                },
                {
                    binding: 2,
                    resource: texture.createView()
                },
                {
                    binding: 3,
                    resource: {
                        buffer: rotationMatrixBuffer
                    }
                }
            ]
        });

        return { mesh: mesh, bindGroup, transformationMatrixBuffer, rotationMatrixBuffer, sampler, texture };
    }

    private createTexture(material: Material): GPUTexture {        
        const texture = this.device.createTexture({
            size: material.textureSize,
            format: this.textureFormat,
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT
        });

        this.device.queue.copyExternalImageToTexture(
            { source: material.textureBitmap },
            { texture: texture },
            material.textureSize
        );

        return texture;
    }

    updateMeshBuffer(bindGroupInfo: MeshBindGroupInfo) {
        const { transform } = bindGroupInfo.mesh.entity;

        const data = transform.transformationMatrix;
        
        const rotation = mat3.fromQuat(transform.rotation);

        this.device.queue.writeBuffer(
            bindGroupInfo.transformationMatrixBuffer, 0, data as Float32Array
        );

        this.device.queue.writeBuffer(
            bindGroupInfo.rotationMatrixBuffer, 0, rotation as Float32Array
        );
    }
}
