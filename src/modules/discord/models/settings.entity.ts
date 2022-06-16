import {Entity, PrimaryColumn, Column} from "typeorm";

@Entity()
export class GuildSettings {
    @PrimaryColumn()
    id: string;

    testId() {
        return `${this.id} is saved :)`
    }
}