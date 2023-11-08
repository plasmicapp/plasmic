import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Task {
  @PrimaryGeneratedColumn("increment")
  id: number;
  @Column({ type: "text", default: "" })
  title: string;
  @Column({ type: "text", default: "" })
  description: string;
  @Column({ type: "boolean", default: false })
  done: boolean;
}
