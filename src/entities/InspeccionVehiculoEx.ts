import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { applySchema } from "src/common/apply-schema.decorator";
import { BitacoraVehiculo } from "./BitacoraVehiculo";
import { Vehiculos } from "./Vehiculos";
import { CatVistaVehiculo } from "./CatVistaVehiculo";
import { CatPartesVehiculoEx } from "./CatPartesVehiculoEx";
import { CatTipoDano } from "./CatTipoDano";
import { CatGradoSeveridad } from "./CatGradoSeveridad";

@applySchema
@Entity("InspeccionVehiculoEx")
export class InspeccionVehiculoEx {
  @PrimaryGeneratedColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("bigint", { name: "IdBitacoraVehiculo", nullable: true })
  idBitacoraVehiculo: number | null;

  @Column("bigint", { name: "IdVehiculo", nullable: true })
  idVehiculo: number | null;

  @Column("bigint", { name: "IdCatVistaVehiculo", nullable: true })
  idCatVistaVehiculo: number | null;

  @Column("bigint", { name: "IdCatPartesVehiculoEx", nullable: true })
  idCatPartesVehiculoEx: number | null;

  @Column("bigint", { name: "IdCatTipoDano", nullable: true })
  idCatTipoDano: number | null;

  @Column("bigint", { name: "IdCatGradoSeveridad", nullable: true })
  idCatGradoSeveridad: number | null;

  @Column("varchar", {
    name: "EvidenciaFotografica",
    nullable: true,
    length: 500,
  })
  evidenciaFotografica: string | null;

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

  @ManyToOne(() => BitacoraVehiculo, {
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "IdBitacoraVehiculo", referencedColumnName: "id" }])
  bitacoraVehiculo: BitacoraVehiculo;

  @ManyToOne(() => Vehiculos, { onDelete: "RESTRICT", onUpdate: "CASCADE" })
  @JoinColumn([{ name: "IdVehiculo", referencedColumnName: "id" }])
  vehiculo: Vehiculos;

  @ManyToOne(() => CatVistaVehiculo, {
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "IdCatVistaVehiculo", referencedColumnName: "id" }])
  catVistaVehiculo: CatVistaVehiculo;

  @ManyToOne(() => CatPartesVehiculoEx, {
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "IdCatPartesVehiculoEx", referencedColumnName: "id" }])
  catPartesVehiculoEx: CatPartesVehiculoEx;

  @ManyToOne(() => CatTipoDano, { onDelete: "RESTRICT", onUpdate: "CASCADE" })
  @JoinColumn([{ name: "IdCatTipoDano", referencedColumnName: "id" }])
  catTipoDano: CatTipoDano;

  @ManyToOne(() => CatGradoSeveridad, {
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "IdCatGradoSeveridad", referencedColumnName: "id" }])
  catGradoSeveridad: CatGradoSeveridad;
}
