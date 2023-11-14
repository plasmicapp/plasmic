import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("users", { schema: "ticketing" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text" })
  email: string;

  @Column({ type: "text" })
  first_name: string;

  @Column({ type: "text" })
  last_name: string;
}

@Entity("tickets", { schema: "ticketing" })
export class Ticket {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text", nullable: true })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text" })
  status: string;

  @ManyToOne((type) => User)
  @JoinColumn({ name: "created_by" })
  created: User;

  @ManyToOne((type) => User, { nullable: true })
  @JoinColumn({ name: "assigned_to" })
  assigned: User | null;

  @OneToMany((type) => Comment, (c) => c.ticket, { cascade: true })
  comments: Comment[];

  @Column({ type: "timestamptz", default: () => "now()" })
  created_at: Date;

  @Column({ type: "timestamptz", default: () => "now()" })
  updated_at: Date;

  @Column({ type: "jsonb", nullable: true })
  tags: string[];
}

@Entity("comments", { schema: "ticketing" })
export class Comment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne((type) => Ticket)
  @JoinColumn({ name: "ticket_id" })
  ticket: Ticket;

  @ManyToOne((type) => User)
  @JoinColumn({ name: "author" })
  author_user: User;

  @Column({ type: "text" })
  comment: string;

  @Column({ type: "timestamptz", default: () => "now()" })
  created_at: Date;
}
