import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class TwitterUser {
    @PrimaryColumn()
    id: string;

    @Column({ nullable: true })
    name?: string;
}
