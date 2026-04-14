import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from "typeorm";
import { applySchema } from "src/common/apply-schema.decorator";

@applySchema
@Index("IX_Clientes_IdPadre", ["idPadre"])
@Entity("Clientes")
export class Clientes {
  @PrimaryColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("bigint", { name: "IdPadre", nullable: true })
  idPadre: number | null;

  @ManyToOne(() => Clientes, (c) => c.hijos, {
    onDelete: "NO ACTION",
    onUpdate: "NO ACTION",
  })
  @JoinColumn([{ name: "IdPadre", referencedColumnName: "id" }])
  padre: Clientes;

  @OneToMany(() => Clientes, (c) => c.padre)
  hijos: Clientes[];
}
