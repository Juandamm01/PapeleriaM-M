-- Pagos con Nequi a través de Wompi: precio por pedido, estado de pago e intentos de cobro
-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'EXPIRADO', 'ANULADO');

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "estadoPago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "pagadoAt" TIMESTAMP(3),
ADD COLUMN     "pagoManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "precioCentavos" INTEGER;

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "montoCentavos" INTEGER NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "wompiTransactionId" TEXT,
    "telefonoFinal" TEXT NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pago_referencia_key" ON "Pago"("referencia");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_wompiTransactionId_key" ON "Pago"("wompiTransactionId");

-- CreateIndex
CREATE INDEX "Pago_pedidoId_createdAt_idx" ON "Pago"("pedidoId", "createdAt");

-- CreateIndex
CREATE INDEX "Pago_estado_updatedAt_idx" ON "Pago"("estado", "updatedAt");

-- CreateIndex
CREATE INDEX "Pedido_estadoPago_createdAt_idx" ON "Pedido"("estadoPago", "createdAt");

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

