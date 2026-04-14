import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { applySchema } from "src/common/apply-schema.decorator";

@applySchema
@Entity("CatEstatusTurno")
export class CatEstatusTurno {
  @PrimaryGeneratedColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("varchar", { name: "Nombre", length: 50, nullable: false })
  nombre: string;

  @Column("tinyint", { name: "Estatus", default: 1, nullable: false })
  estatus: number;

  @Column("datetime", {
    name: "FechaCreacion",
    default: () => "CURRENT_TIMESTAMP",
    nullable: false,
  })
  fechaCreacion: Date;

  @Column("datetime", {
    name: "FechaActualizacion",
    default: () => "CURRENT_TIMESTAMP",
    nullable: false,
  })
  fechaActualizacion: Date;
}
