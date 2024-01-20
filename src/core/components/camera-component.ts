import { mat4, vec3 } from "wgpu-matrix";
import { SpaceEntityConfig } from "../space-entity";
import { EntityComponent } from "./entity-component";

export interface CameraConfig extends SpaceEntityConfig {
    far?: number;
    near?: number;
    fov?: number;

    screenWidth: number;
    screenHeight: number;
}

export class CameraComponent extends EntityComponent {
    public far: number;
    public near: number;
    public fov: number;

    public screenWidth!: number;
    public screenHeight!: number;

    private aspect!: number;
    
    constructor(config: CameraConfig) {
        super();

        this.far = config.far ?? 100.0;
        this.near = config.near ?? 1.0;
        this.fov = config.fov ?? Math.PI * 2 / 5;

        this.setScreenSizes(config.screenWidth, config.screenHeight);
    }

    public setScreenSizes(width: number, height: number) {
        this.screenWidth = width;
        this.screenHeight = height;

        this.aspect = this.screenWidth / this.screenHeight;
    }

    private getViewMatrix() {
        const { transform } = this.entity;

        let result = mat4.identity();

        result = mat4.mul(result, mat4.fromQuat(transform.rotation));
        result = mat4.translate(result, vec3.negate(transform.position));

        return result;
    }

    public getViewProjectionMatrix() {
        const perspectiveMatrix = mat4.perspective(
            this.fov, this.aspect, this.near, this.far,
        );

        const viewMatrix = this.getViewMatrix();

        const transformMatrix = mat4.multiply(perspectiveMatrix, viewMatrix);

        return transformMatrix;
    }
}
