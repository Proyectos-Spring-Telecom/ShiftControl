import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { applySchema } from "src/common/apply-schema.decorator";
import { Vehiculos } from "./Vehiculos";

@applySchema
@Entity("Tablero")
export class Tablero {
  @PrimaryGeneratedColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("varchar", { name: "FotoTablero", nullable: true, length: 500 })
  fotoTablero: string | null;

  @Column("bigint", { name: "IdVehiculo", nullable: true })
  idVehiculo: number | null;

  @Column("float", { name: "KmActual", nullable: true })
  kmActual: number | null;

  @ManyToOne(() => Vehiculos, { onDelete: "RESTRICT", onUpdate: "CASCADE" })
  @JoinColumn([{ name: "IdVehiculo", referencedColumnName: "id" }])
  vehiculo: Vehiculos;
}
