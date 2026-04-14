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
@Entity("DocumentacionVehiculo")
export class DocumentacionVehiculo {
  @PrimaryGeneratedColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("bigint", { name: "IdVehiculo", nullable: true })
  idVehiculo: number | null;

  @Column("tinyint", { name: "TarjetaCirculacion", nullable: true })
  tarjetaCirculacion: number | null;

  @Column("tinyint", { name: "Verificacion", nullable: true })
  verificacion: number | null;

  @Column("tinyint", { name: "PolizaSeguro", nullable: true })
  polizaSeguro: number | null;

  @Column("tinyint", { name: "Tenencia", nullable: true })
  tenencia: number | null;

  @Column("tinyint", { name: "CertificadoEcologico", nullable: true })
  certificadoEcologico: number | null;

  @Column("tinyint", { name: "Manual", nullable: true })
  manual: number | null;

  @Column("tinyint", { name: "PermisoCarga", nullable: true })
  permisoCarga: number | null;

  @Column("tinyint", { name: "CartaPorte", nullable: true })
  cartaPorte: number | null;

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
