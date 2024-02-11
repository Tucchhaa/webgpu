import { mat3, mat4, quat, vec3 } from "wgpu-matrix";
import { CAMERA_BINDGROUP_INDEX, OBJECT_BINDGROUP_INDEX, MATRIX_4x4_BYTELENGTH, MATRIX_3x4_BYTELENGTH, VECTOR_4_BYTELENGTH } from "./const";
import { MeshComponent } from "../components";
import { Material } from "../material";
import { Scene } from "../scene/scene";

const DIRECT_LIGHT_SIZE = 4 * (3 + 1 + 12); // color + rotation
const POINT_LIGHT_SIZE = 4 * (3 + 1 + 3 + 1 + 3 + 1); // pos + intensity + color + range + direction + angle

interface SceneBindGroupInfo {
    scene: Scene;

    bindGroup: GPUBindGroup;

    viewProjectionMatrixBuffer: GPUBuffer;

    directLightsBuffer: GPUBuffer;

    pointLightsBuffer: GPUBuffer;
}

interface MeshBindGroupInfo {
    bindGroup: GPUBindGroup;

    mesh: MeshComponent;

    transformationBuffer: GPUBuffer;

    texture: GPUTexture;

    sampler: GPUSampler;
}

export class BindGroupsManager {
    private readonly sceneBindGroups: { [id: number]: SceneBindGroupInfo };
    
    private readonly objectBindGroups: { [id: number]: MeshBindGroupInfo };

    // ===

    private device: GPUDevice;

    private textureFormat: GPUTextureFormat;

    // ===
    
    constructor(device: GPUDevice) {
        this.sceneBindGroups = {};
        this.objectBindGroups = {};

        this.device = device;
        this.textureFormat = navigator.gpu.getPreferredCanvasFormat();
    }

    public getSceneBindGroup(scene: Scene, pipeline: GPUPipelineBase): GPUBindGroup {
        let sceneBindGroup = this.sceneBindGroups[scene.ID];

        if(sceneBindGroup === undefined) {
            sceneBindGroup = this.createSceneBindGroup(scene, pipeline);
            this.sceneBindGroups[scene.ID] = sceneBindGroup;
        }

        this.updateSceneBuffer(sceneBindGroup);

        return sceneBindGroup.bindGroup;
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
    private createSceneBindGroup(scene: Scene, pipeline: GPUPipelineBase): SceneBindGroupInfo {
        const viewProjectionMatrixBuffer = this.device.createBuffer({
            label: "Camera uniform buffer",
            size: MATRIX_4x4_BYTELENGTH + VECTOR_4_BYTELENGTH, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const directLightsBuffer = this.device.createBuffer({
            label: 'Directional light buffer',
            size: 10 * DIRECT_LIGHT_SIZE,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        const pointLightsBuffer = this.device.createBuffer({
            label: 'Point light buffer',
            size: 10 * POINT_LIGHT_SIZE,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        this.device.queue.writeBuffer(directLightsBuffer, 0, new Float32Array([1, -1, -1]));

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
                        buffer: directLightsBuffer
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: pointLightsBuffer
                    }
                }
            ]
        });

        return { 
            bindGroup, 
            scene, 
            viewProjectionMatrixBuffer,
            directLightsBuffer,
            pointLightsBuffer
        };
    }

    private updateSceneBuffer(bindGroupInfo: SceneBindGroupInfo) {
        const { scene } = bindGroupInfo;

        const viewProjectionMatrix = scene.mainCamera.getViewProjectionMatrix();

        const { directLights, pointLights } = scene;

        const directLightsData = new Float32Array(directLights.length * DIRECT_LIGHT_SIZE);
        const pointLightsData = new Float32Array(pointLights.length * POINT_LIGHT_SIZE);

        directLights.forEach((light, index) => {
            directLightsData.set(light.color, DIRECT_LIGHT_SIZE/4 * index)
            directLightsData.set([light.intensity], DIRECT_LIGHT_SIZE/4 * index + 3);
            
            directLightsData.set(mat3.fromQuat(light.transform.rotation), DIRECT_LIGHT_SIZE/4 * index + 4);
        });

        pointLights.forEach((light, index) => {
            pointLightsData.set(light.transform.position, (POINT_LIGHT_SIZE/4) * index);
            pointLightsData.set([light.intensity], (POINT_LIGHT_SIZE/4) * index + 3);

            pointLightsData.set(light.color, (POINT_LIGHT_SIZE/4) * index + 4);
            pointLightsData.set([light.range], (POINT_LIGHT_SIZE/4) * index + 7);

            const direction = vec3.transformQuat(vec3.normalize(vec3.create(0, 0, -1)), light.transform.rotation);

            pointLightsData.set(direction, (POINT_LIGHT_SIZE/4) * index + 8);
            pointLightsData.set([light.angle], (POINT_LIGHT_SIZE/4) * index + 11);
        });

        this.device.queue.writeBuffer(
            bindGroupInfo.viewProjectionMatrixBuffer, 0, viewProjectionMatrix as Float32Array
        );

        this.device.queue.writeBuffer(
            bindGroupInfo.viewProjectionMatrixBuffer, MATRIX_4x4_BYTELENGTH, scene.mainCamera.transform.position as Float32Array
        );

        this.device.queue.writeBuffer(
            bindGroupInfo.directLightsBuffer, 0, directLightsData
        );

        this.device.queue.writeBuffer(
            bindGroupInfo.pointLightsBuffer, 0, pointLightsData
        );
    }


    // ===
    // Object 3D
    // ===

    private createMeshBindGroup(mesh: MeshComponent, pipeline: GPUPipelineBase): MeshBindGroupInfo {
        const { material } = mesh;

        const transformationBuffer = this.device.createBuffer({
            label: "mesh transformation buffer",
            size: MATRIX_4x4_BYTELENGTH + MATRIX_3x4_BYTELENGTH, 
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
                        buffer: transformationBuffer
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

        return { mesh, bindGroup, transformationBuffer: transformationBuffer, sampler, texture };
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

        const { transformationMatrix } = transform;
        const rotationMatrix = mat3.fromQuat(transform.rotation);

        this.device.queue.writeBuffer(
            bindGroupInfo.transformationBuffer, 0, transformationMatrix as Float32Array
        );

        this.device.queue.writeBuffer(
            bindGroupInfo.transformationBuffer, MATRIX_4x4_BYTELENGTH, rotationMatrix as Float32Array
        );
    }
}
