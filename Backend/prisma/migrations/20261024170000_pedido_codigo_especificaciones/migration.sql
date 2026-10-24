-- CreateEnum
CREATE TYPE "TamanoPapel" AS ENUM ('CARTA', 'OFICIO');

-- CreateEnum
CREATE TYPE "TipoImpresion" AS ENUM ('BN', 'COLOR');

-- AlterTable: "codigo" entra como nullable para poder asignar un código a los pedidos existentes
ALTER TABLE "Pedido" ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "comprobanteNombre" TEXT,
ADD COLUMN     "comprobanteRuta" TEXT,
ADD COLUMN     "comprobanteTipo" TEXT,
ADD COLUMN     "copias" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "dobleCara" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referenciaNequi" TEXT,
ADD COLUMN     "tamano" "TamanoPapel" NOT NULL DEFAULT 'CARTA',
ADD COLUMN     "tipoImpresion" "TipoImpresion" NOT NULL DEFAULT 'BN';

-- Backfill: código derivado del id para los pedidos creados antes de esta migración
UPDATE "Pedido" SET "codigo" = 'MM-' || upper(substr(md5("id"), 1, 6)) WHERE "codigo" IS NULL;

ALTER TABLE "Pedido" ALTER COLUMN "codigo" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_codigo_key" ON "Pedido"("codigo");

-- CreateIndex
CREATE INDEX "Pedido_estado_createdAt_idx" ON "Pedido"("estado", "createdAt");
