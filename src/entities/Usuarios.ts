import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { applySchema } from "src/common/apply-schema.decorator";

/**
 * Tabla sombra: vínculo ShiftControl entre tenant (IdCliente) y usuario en Next (IdUsuario).
 */
@applySchema
@Index("IDX_UQ_IdCliente_IdUsuario", ["idUsuario", "idCliente"], { unique: true })
@Entity("Usuarios")
export class Usuarios {
  @PrimaryGeneratedColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("bigint", { name: "IdCliente", nullable: true })
  idCliente: number | null;

  @Column("bigint", { name: "IdUsuario", nullable: true })
  idUsuario: number | null;

  @Column("bigint", { name: "IdSolucion", nullable: true })
  idSolucion: number | null;

  @Column("bigint", { name: "IdClienteGeneral", nullable: true })
  idClienteGeneral: number | null;

  @Column("bigint", { name: "IdRol", nullable: true })
  idRol: number | null;
}
