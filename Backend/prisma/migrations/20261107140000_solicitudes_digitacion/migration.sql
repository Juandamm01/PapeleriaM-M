-- Solicitudes de digitación con cotización manual. Solo agrega tablas.
-- CreateEnum
CREATE TYPE "EstadoDigitacion" AS ENUM ('RECIBIDO', 'EN_REVISION', 'COTIZADO', 'ACEPTADO', 'FINALIZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "SolicitudDigitacion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "correo" TEXT,
    "tipoTrabajo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "paginasAprox" INTEGER,
    "formatoEntrega" TEXT NOT NULL,
    "fechaLimite" TIMESTAMP(3),
    "observaciones" TEXT,
    "archivos" JSONB NOT NULL,
    "estado" "EstadoDigitacion" NOT NULL DEFAULT 'RECIBIDO',
    "precioCentavos" INTEGER,
    "notaCliente" TEXT,
    "consentimientoAt" TIMESTAMP(3) NOT NULL,
    "aceptadaAt" TIMESTAMP(3),
    "archivosEliminadosAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitudDigitacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudDigitacion_codigo_key" ON "SolicitudDigitacion"("codigo");

-- CreateIndex
CREATE INDEX "SolicitudDigitacion_estado_createdAt_idx" ON "SolicitudDigitacion"("estado", "createdAt");

