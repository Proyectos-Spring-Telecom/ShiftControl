import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { applySchema } from "src/common/apply-schema.decorator";
import { Vehiculos } from "./Vehiculos";
import { Clientes } from "./Clientes";
import { Turnos } from "./Turnos";
import { Tablero } from "./Tablero";
import { TestigosVehiculo } from "./TestigosVehiculo";
import { NivelesFluidos } from "./NivelesFluidos";
import { LucesVehiculo } from "./LucesVehiculo";
import { AccesoriosVehiculo } from "./AccesoriosVehiculo";
import { DocumentacionVehiculo } from "./DocumentacionVehiculo";

@applySchema
@Entity("BitacoraVehiculo")
export class BitacoraVehiculo {
  @PrimaryGeneratedColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("bigint", { name: "IdVehiculo" })
  idVehiculo: number;

  @Column("bigint", { name: "IdCliente" })
  idCliente: number;

  @Column("tinyint", { name: "Tipo", nullable: true })
  tipo: number | null;

  @Column("bigint", { name: "IdTablero" })
  idTablero: number;

  @Column("bigint", { name: "IdTestigosVehiculo" })
  idTestigosVehiculo: number;

  @Column("bigint", { name: "IdNivelesFluidos" })
  idNivelesFluidos: number;

  @Column("bigint", { name: "IdLucesVehiculo" })
  idLucesVehiculo: number;

  @Column("bigint", { name: "IdAccesoriosVehiculo" })
  idAccesoriosVehiculo: number;

  @Column("bigint", { name: "IdDocumentacionVehiculo" })
  idDocumentacionVehiculo: number;

  @Column("datetime", {
    name: "FechaCreacion",
    default: () => "CURRENT_TIMESTAMP",
  })
  fechaCreacion: Date;

  @Column("tinyint", { name: "Estatus", default: 1 })
  estatus: number;

  @Column("bigint", { name: "IdTurno", nullable: true })
  idTurno: number | null;

  @ManyToOne(() => Vehiculos, { onDelete: "RESTRICT", onUpdate: "CASCADE" })
  @JoinColumn([{ name: "IdVehiculo", referencedColumnName: "id" }])
  vehiculo: Vehiculos;

  @ManyToOne(() => Clientes, { onDelete: "RESTRICT", onUpdate: "CASCADE" })
  @JoinColumn([{ name: "IdCliente", referencedColumnName: "id" }])
  cliente: Clientes;

  @ManyToOne(() => Turnos, { onDelete: "SET NULL", onUpdate: "CASCADE" })
  @JoinColumn([{ name: "IdTurno", referencedColumnName: "id" }])
  turno: Turnos;

  @ManyToOne(() => Tablero, { onDelete: "RESTRICT", onUpdate: "CASCADE" })
  @JoinColumn([{ name: "IdTablero", referencedColumnName: "id" }])
  tablero: Tablero;

  @ManyToOne(() => TestigosVehiculo, {
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "IdTestigosVehiculo", referencedColumnName: "id" }])
  testigosVehiculo: TestigosVehiculo;

  @ManyToOne(() => NivelesFluidos, {
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "IdNivelesFluidos", referencedColumnName: "id" }])
  nivelesFluidos: NivelesFluidos;

  @ManyToOne(() => LucesVehiculo, { onDelete: "RESTRICT", onUpdate: "CASCADE" })
  @JoinColumn([{ name: "IdLucesVehiculo", referencedColumnName: "id" }])
  lucesVehiculo: LucesVehiculo;

  @ManyToOne(() => AccesoriosVehiculo, {
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "IdAccesoriosVehiculo", referencedColumnName: "id" }])
  accesoriosVehiculo: AccesoriosVehiculo;

  @ManyToOne(() => DocumentacionVehiculo, {
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "IdDocumentacionVehiculo", referencedColumnName: "id" }])
  documentacionVehiculo: DocumentacionVehiculo;
}
