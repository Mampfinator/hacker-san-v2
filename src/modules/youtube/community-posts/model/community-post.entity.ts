import { Entity, PrimaryColumn } from "typeorm";

@Entity()
export class CommunityPost {
    @PrimaryColumn()
    id: string;
}
