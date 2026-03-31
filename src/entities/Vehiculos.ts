import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { applySchema } from "src/common/apply-schema.decorator";

@applySchema
@Entity("Vehiculos")
export class Vehiculos {
  @PrimaryGeneratedColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("bigint", { name: "IdCliente" })
  idCliente: number;

  /** Placas oficiales (S/P si no tiene). */
  @Column("varchar", { name: "IdVehiculo", length: 10 })
  idVehiculo: string;
}
