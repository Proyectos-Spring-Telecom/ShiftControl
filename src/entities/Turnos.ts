import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { applySchema } from "src/common/apply-schema.decorator";

@applySchema
@Entity("Turnos")
export class Turnos {
  @PrimaryGeneratedColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("bigint", { name: "IdVehiculo", nullable: true })
  idVehiculo: number | null;

  @Column("varchar", { name: "IdCliente", nullable: true, length: 45 })
  idCliente: string | null;
}
