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
