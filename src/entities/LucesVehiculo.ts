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
@Entity("LucesVehiculo")
export class LucesVehiculo {
  @PrimaryGeneratedColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("bigint", { name: "IdVehiculo" })
  idVehiculo: number;

  @Column("tinyint", { name: "Altas", nullable: true })
  altas: number | null;

  @Column("tinyint", { name: "Cortas", nullable: true })
  cortas: number | null;

  @Column("tinyint", { name: "IntermitentesDelanteras", nullable: true })
  intermitentesDelanteras: number | null;

  @Column("tinyint", { name: "IntermitentesTraseras", nullable: true })
  intermitentesTraseras: number | null;

  @Column("tinyint", { name: "DireccionalesDelanteras", nullable: true })
  direccionalesDelanteras: number | null;

  @Column("tinyint", { name: "DireccionalesTraseras", nullable: true })
  direccionalesTraseras: number | null;

  @Column("tinyint", { name: "IntermitentesLaterales", nullable: true })
  intermitentesLaterales: number | null;

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
