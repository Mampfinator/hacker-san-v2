import { Entity, PrimaryColumn } from "typeorm";

@Entity()
export class GuildSettings {
    @PrimaryColumn()
    id: string;

    testId() {
        return `${this.id} is saved :)`;
    }
}
