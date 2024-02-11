import { Vec3, vec3 } from "wgpu-matrix";
import { EntityComponent } from "..";

interface LightConfig {
    intensity?: number;

    color?: Vec3;
}

abstract class LightComponent extends EntityComponent {
    public intensity: number;

    public color: Vec3;

    constructor(config: LightConfig = {}) {
        super();

        this.intensity = config.intensity ?? 1;
        this.color = config.color ?? vec3.create(255, 255, 255);
    }
}

interface DirectLightConfig extends LightConfig {

}

export class DirectLightComponent extends LightComponent {

}

// pos + range 
interface PointLightConfig extends LightConfig {
    range?: number;

    angle?: number;
}

export class PointLightComponent extends LightComponent {
    public range: number;

    public angle: number;

    constructor(config: PointLightConfig = {}) {
        super(config);

        this.range = config.range ?? 100;
        this.angle = config.angle ?? Math.PI;
    }
}