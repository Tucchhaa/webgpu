import { Transform } from ".";
import { EntityComponentType, SpaceEntity } from "../space-entity";

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

    public get transform(): Transform {
        return this.entity.transform;
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

    requireComponent<T extends EntityComponent>(componentType: EntityComponentType<T>): T {
        return this.entity.requireComponent(componentType);
    }
}
