import { Vec3, Quat, Mat4, vec3, quat, mat4 } from "wgpu-matrix";
import { EntityComponent } from "./entity-component";

export interface TransformConfig {
    position?: Vec3;

    rotation?: Quat;

    scale?: Vec3;
}

export class Transform extends EntityComponent {
    private _position: Vec3;

    private _rotation: Quat;

    private _scale: Vec3;

    protected _transformationMatrix: Mat4;

    constructor(config: TransformConfig = {}) {
        super();

        this._position = config.position ?? vec3.zero();
        this._rotation = config.rotation ?? quat.identity();
        this._scale = config.scale ?? vec3.fromValues(1, 1, 1);

        this._transformationMatrix = this.computeTransformationMatrix();
    }

    private computeTransformationMatrix(): Mat4 {
        let result = mat4.identity();

        result = mat4.translate(result, this.position);
        result = mat4.mul(result, mat4.fromQuat(this.rotation));
        result = mat4.scale(result, this.scale);

        return result;
    }

    // === 
    // Getters and setters
    // ===
    public get position() { return this._position; }

    public set position(value: Vec3) {
        this._position = value;

        this._transformationMatrix = this.computeTransformationMatrix();
    }

    public get rotation() { return this._rotation; }

    public set rotation(value: Quat) {
        this._rotation = value;

        this._transformationMatrix = this.computeTransformationMatrix();
    }

    public get scale() { return this._scale; }

    public set scale(value: Vec3) {
        this._scale = value;

        this._transformationMatrix = this.computeTransformationMatrix();
    }

    public get transformationMatrix() { return this._transformationMatrix; }

    // ===
    // Transformation
    // ===
    public translate(vector: Vec3, transform?: Transform): void {
        const { rotation } = transform ?? this;

        (vector as Float32Array)[2] = -(vector as Float32Array)[2]!;

        const rotatedVector = vec3.transformQuat(vector, quat.inverse(rotation));

        this.position = vec3.add(this.position, rotatedVector);
    }

    public rotate(rotation: Quat, transform?: Transform): void {
        if(transform && transform !== this) {
            const relativeRotation = quat.mul(quat.mul(transform.rotation, rotation), quat.conjugate(transform.rotation));

            this.rotation = quat.mul(relativeRotation, this.rotation);

        } else {
            this.rotation = quat.mul(this.rotation, rotation);
        }
    }

    public scaleBy(scalation: Vec3): void {
        this.scale = vec3.multiply(this._scale, scalation);
    }
}

export const WorldTransform = new Transform();
