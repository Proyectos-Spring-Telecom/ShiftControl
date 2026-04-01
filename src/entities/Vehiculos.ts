import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import { applySchema } from "src/common/apply-schema.decorator";

/**
 * Tabla sombra de vehículos.
 * El Id es el MISMO que Next.Vehiculos.Id (no es autoincrement).
 * Solo guarda Id, IdCliente y Placas para queries locales rápidos.
 * Los datos completos (marca, modelo, fotos, documentos) se consultan a Next API.
 */
@applySchema
@Index("UQ_Vehiculos_Placas", ["placas"], { unique: true })
@Entity("Vehiculos")
export class Vehiculos {
  @PrimaryColumn({ type: "bigint", name: "Id" })
  id: number;

  @Column("bigint", { name: "IdCliente" })
  idCliente: number;

  @Column("varchar", { name: "Placas", length: 10 })
  placas: string;
}
