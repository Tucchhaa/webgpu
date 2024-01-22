import { EntityComponent } from "..";

interface LightConfig {
    intensity?: number;
}

abstract class LightComponent extends EntityComponent {
    public intensity: number;

    constructor(config: DirectLightConfig = {}) {
        super();

        this.intensity = config.intensity ?? 1;
    }
}

interface DirectLightConfig extends LightConfig {

}

export class DirectLightComponent extends LightComponent {

}

// pos + range 
interface PointLightConfig extends LightConfig {
    range?: number;
}

export class PointLightComponent extends LightComponent {
    public range: number;

    constructor(config: PointLightConfig = {}) {
        super(config);

        this.range = config.range ?? 100;
    }
}