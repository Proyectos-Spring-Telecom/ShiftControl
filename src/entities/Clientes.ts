import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { applySchema } from "src/common/apply-schema.decorator";

@applySchema
@Index("IX_Clientes_IdPadre", ["idPadre"], {})
@Entity("Clientes")
export class Clientes {
  @PrimaryGeneratedColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("bigint", { name: "IdPadre", nullable: true })
  idPadre: number | null;

  /** Referencia al cliente maestro en Next (u otro sistema); sin FK en BD. */
  @Column("bigint", { name: "IdCliente", nullable: true })
  idCliente: number | null;

  @ManyToOne(() => Clientes, (clientes) => clientes.clientes, {
    onDelete: "NO ACTION",
    onUpdate: "NO ACTION",
  })
  @JoinColumn([{ name: "IdPadre", referencedColumnName: "id" }])
  idPadre2: Clientes;

  @OneToMany(() => Clientes, (clientes) => clientes.idPadre2)
  clientes: Clientes[];
}
