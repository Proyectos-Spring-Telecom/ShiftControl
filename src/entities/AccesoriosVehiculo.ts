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
@Entity("AccesoriosVehiculo")
export class AccesoriosVehiculo {
  @PrimaryGeneratedColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("bigint", { name: "IdVehiculo" })
  idVehiculo: number;

  @Column("tinyint", { name: "Limpiaparabrisas", nullable: true })
  limpiaparabrisas: number | null;

  @Column("tinyint", { name: "Extintor", nullable: true })
  extintor: number | null;

  @Column("tinyint", { name: "TringulosSeguridad", nullable: true })
  tringulosSeguridad: number | null;

  @Column("tinyint", { name: "Stereo", nullable: true })
  stereo: number | null;

  @Column("tinyint", { name: "Tapetes", nullable: true })
  tapetes: number | null;

  @Column("tinyint", { name: "Refaccion", nullable: true })
  refaccion: number | null;

  @Column("tinyint", { name: "Gato", nullable: true })
  gato: number | null;

  @Column("tinyint", { name: "BirloSeguridad", nullable: true })
  birloSeguridad: number | null;

  @Column("tinyint", { name: "Estatus", default: 1 })
  estatus: number;

  @Column("datetime", {
    name: "FechaCreacion",
    default: () => "CURRENT_TIMESTAMP",
  })
  fechaCreacion: Date;

  @Column("datetime", {
    name: "FechaActualizacion",
    default: () => "CURRENT_TIMESTAMP",
  })
  fechaActualizacion: Date;

  @ManyToOne(() => Vehiculos, { onDelete: "RESTRICT", onUpdate: "CASCADE" })
  @JoinColumn([{ name: "IdVehiculo", referencedColumnName: "id" }])
  vehiculo: Vehiculos;
}
