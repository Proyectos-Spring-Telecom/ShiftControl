import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import { applySchema } from "src/common/apply-schema.decorator";

@applySchema
@Index("UQ_Usuarios_IdCliente_Id", ["idCliente", "id"], { unique: true })
@Entity("Usuarios")
export class Usuarios {
  @PrimaryColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("bigint", { name: "IdCliente", nullable: true })
  idCliente: number | null;

  @Column("bigint", { name: "IdRol", nullable: true })
  idRol: number | null;

  @Column("bigint", { name: "IdSolucion", nullable: true })
  idSolucion: number | null;

  @Column("bigint", { name: "IdClienteGeneral", nullable: true })
  idClienteGeneral: number | null;

  @Column("bigint", { name: "IdFaceAuth", nullable: true })
  idFaceAuth: number | null;
}
