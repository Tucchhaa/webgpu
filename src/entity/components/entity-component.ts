import { Vec3, Quat } from "wgpu-matrix";
import { EntityComponentType, SpaceEntity, SpaceEntityConfig } from "../space-entity";

export abstract class EntityComponent {
    private static _lastComponentID = -1;

    private static generateInstanceID(): number {
        EntityComponent._lastComponentID++;

        return EntityComponent._lastComponentID;
    }

    // ===

    public readonly ID: number;

    private _entity: SpaceEntity | null;

    public get entity(): SpaceEntity {
        return this._entity!;
    }

    constructor() {
        this.ID = EntityComponent.generateInstanceID();

        this._entity = null;
    }

    // ===

    attachTo(entity: SpaceEntity) {
        this.removeAttachment();

        this._entity = entity;

        this.onAttached();
    }

    removeAttachment() {
        this.beforeAttachmentRemoved();

        this._entity = null;
    }

    protected onAttached(): void {}

    protected beforeAttachmentRemoved(): void {}

    // ===

    requireComponent(componentType: EntityComponentType): EntityComponent {
        return this.entity.requireComponent(componentType);
    }
}
