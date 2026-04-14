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
@Entity("TestigosVehiculo")
export class TestigosVehiculo {
  @PrimaryGeneratedColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("bigint", { name: "IdVehiculo", nullable: true })
  idVehiculo: number | null;

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

  @Column("tinyint", { name: "TemperaturaMotorAlta", nullable: true })
  temperaturaMotorAlta: number | null;

  @Column("tinyint", { name: "PresionAceite", nullable: true })
  presionAceite: number | null;

  @Column("tinyint", { name: "Bateria", nullable: true })
  bateria: number | null;

  @Column("tinyint", { name: "Airbag", nullable: true })
  airbag: number | null;

  @Column("tinyint", { name: "CheckEngine", nullable: true })
  checkEngine: number | null;

  @Column("tinyint", { name: "ABS", nullable: true })
  abs: number | null;

  @Column("tinyint", { name: "SistemaFrenos", nullable: true })
  sistemaFrenos: number | null;

  @Column("tinyint", { name: "ControlEstabilidad", nullable: true })
  controlEstabilidad: number | null;

  @Column("tinyint", { name: "ControlTraccion", nullable: true })
  controlTraccion: number | null;

  @Column("tinyint", { name: "NivelCombustible", nullable: true })
  nivelCombustible: number | null;

  @Column("tinyint", { name: "FiltroParticulas", nullable: true })
  filtroParticulas: number | null;

  @Column("tinyint", { name: "BujiasIncandecentes", nullable: true })
  bujiasIncandecentes: number | null;

  @Column("tinyint", { name: "PresionNeumatico", nullable: true })
  presionNeumatico: number | null;

  @Column("tinyint", { name: "FallaDireccionAsistida", nullable: true })
  fallaDireccionAsistida: number | null;

  @Column("tinyint", { name: "RefrigeranteMotor", nullable: true })
  refrigeranteMotor: number | null;

  @Column("tinyint", { name: "BloqueoDiferencial", nullable: true })
  bloqueoDiferencial: number | null;

  @Column("tinyint", { name: "ControlAcelerador", nullable: true })
  controlAcelerador: number | null;

  @Column("tinyint", { name: "LlavePresencia", nullable: true })
  llavePresencia: number | null;

  @Column("tinyint", { name: "NivelLuiquidoFrenos", nullable: true })
  nivelLiquidoFrenos: number | null;

  @Column("tinyint", { name: "Cajuela", nullable: true })
  cajuela: number | null;

  @Column("tinyint", { name: "Puerta", nullable: true })
  puerta: number | null;

  @Column("tinyint", { name: "CinturonSeguridad", nullable: true })
  cinturonSeguridad: number | null;

  @Column("tinyint", { name: "CambioAceite", nullable: true })
  cambioAceite: number | null;

  @Column("tinyint", { name: "Servicio", nullable: true })
  servicio: number | null;

  @ManyToOne(() => Vehiculos, { onDelete: "RESTRICT", onUpdate: "CASCADE" })
  @JoinColumn([{ name: "IdVehiculo", referencedColumnName: "id" }])
  vehiculo: Vehiculos;
}
