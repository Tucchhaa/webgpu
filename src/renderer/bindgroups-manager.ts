import { Material, Object3D } from "../entity";
import { CameraComponent } from "../entity/components/camera-component";
import { SpaceEntity } from "../entity/space-entity";
import { CAMERA_BINDGROUP_INDEX, OBJECT_BINDGROUP_INDEX, MATRIX_4x4_BYTELENGTH } from "./const";

interface CameraBindGroupInfo {
    camera: CameraComponent;

    bindGroup: GPUBindGroup;

    viewProjectionMatrixBuffer: GPUBuffer;
}

interface Object3DBindGroupInfo {
    object3d: SpaceEntity;

    bindGroup: GPUBindGroup;

    transformationMatrixBuffer: GPUBuffer;

    texture: GPUTexture;

    sampler: GPUSampler;
}

export class BindGroupsManager {
    private readonly cameraBindGroups: { [id: number]: CameraBindGroupInfo };
    
    private readonly objectBindGroups: { [id: number]: Object3DBindGroupInfo };

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

    public getCameraBindGroup(camera: CameraComponent, pipeline: GPUPipelineBase): GPUBindGroup {
        let cameraBindGroup = this.cameraBindGroups[camera.ID];

        if(cameraBindGroup === undefined) {
            cameraBindGroup = this.createCameraBindGroup(camera, pipeline);
            this.cameraBindGroups[camera.ID] = cameraBindGroup;
        }

        this.updateCameraBuffer(cameraBindGroup);

        return cameraBindGroup.bindGroup;
    }

    public getObjectBindGroup(object3d: Object3D, pipeline: GPUPipelineBase): GPUBindGroup {
        let objectBindGroup = this.objectBindGroups[object3d.ID];

        if(objectBindGroup === undefined) {
            objectBindGroup = this.createObjectBindGroup(object3d, pipeline);
            this.objectBindGroups[object3d.ID] = objectBindGroup;
        }

        this.updateObjectBuffer(objectBindGroup);

        return objectBindGroup.bindGroup;
    }

    // ===
    // Camera
    // ===
    private createCameraBindGroup(camera: CameraComponent, pipeline: GPUPipelineBase): CameraBindGroupInfo {
        const viewProjectionMatrixBuffer = this.device.createBuffer({
            label: "Camera view-projection buffer",
            size: MATRIX_4x4_BYTELENGTH, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

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
            ]
        });

        return { camera, bindGroup, viewProjectionMatrixBuffer };
    }

    private updateCameraBuffer(bindGroupInfo: CameraBindGroupInfo) {
        let data = bindGroupInfo.camera.getViewProjectionMatrix();

        this.device.queue.writeBuffer(
            bindGroupInfo.viewProjectionMatrixBuffer, 0, data as Float32Array
        );
    }


    // ===
    // Object 3D
    // ===

    private createObjectBindGroup(object3d: Object3D, pipeline: GPUPipelineBase): Object3DBindGroupInfo {
        const { material } = object3d;

        const transformationMatrixBuffer = this.device.createBuffer({
            label: "object transformation buffer",
            size: MATRIX_4x4_BYTELENGTH, 
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
            ]
        });

        return { object3d, bindGroup, transformationMatrixBuffer, sampler, texture };
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

    updateObjectBuffer(bindGroupInfo: Object3DBindGroupInfo) {
        const data = bindGroupInfo.object3d.transformationMatrix;

        this.device.queue.writeBuffer(
            bindGroupInfo.transformationMatrixBuffer, 0, data as Float32Array
        );
    }
}
