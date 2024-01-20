import { STRIDE_SIZE } from "../renderer/const";
import { SpaceEntity, SpaceEntityConfig } from "./space-entity";

export class Mesh {
    public vertices: Float32Array;

    public readonly polygonsCount: number;

    constructor(vertices: Float32Array) {
        this.vertices = vertices;

        this.polygonsCount = Math.ceil(vertices.length / STRIDE_SIZE);
    }
}

export interface MaterialConfig {
    textureBitmap: ImageBitmap;

    samplerMinFilter: GPUFilterMode;

    samplerMagFilter: GPUFilterMode;
}

export class Material {
    private static _lastMaterialID = -1;

    private static generateInstanceID(): number {
        Material._lastMaterialID++;

        return Material._lastMaterialID;
    }

    public readonly ID: number;

    public readonly textureBitmap: ImageBitmap;

    public readonly textureSize: [number, number];
    
    public readonly samplerMinFilter: GPUFilterMode;
    
    public readonly samplerMagFilter: GPUFilterMode;

    constructor(config: MaterialConfig) {
        this.ID = Material.generateInstanceID();

        this.textureBitmap = config.textureBitmap;
        this.textureSize = [this.textureBitmap.width, this.textureBitmap.height];

        this.samplerMinFilter = config.samplerMinFilter;
        this.samplerMagFilter = config.samplerMagFilter;
    }
}

export interface Object3DConfig extends SpaceEntityConfig {
    mesh: Mesh;

    material: Material;
}

export class Object3D extends SpaceEntity {
    public readonly mesh: Mesh;

    public readonly material: Material;

    constructor(config: Object3DConfig) {
        super(config);

        this.mesh = config.mesh;

        this.material = config.material;
    }
}