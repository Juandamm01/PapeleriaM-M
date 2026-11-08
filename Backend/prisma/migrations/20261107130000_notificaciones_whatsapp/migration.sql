-- Avisos por WhatsApp: registro de cada notificación, sin duplicados por pedido. Solo agrega tablas.
-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('PEDIDO_LISTO');

-- CreateEnum
CREATE TYPE "EstadoNotificacion" AS ENUM ('PENDIENTE', 'ENVIANDO', 'ENVIADA', 'FALLIDA', 'OMITIDA');

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "estado" "EstadoNotificacion" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "mensajeId" TEXT,
    "detalle" TEXT,
    "siguienteIntentoAt" TIMESTAMP(3),
    "enviadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notificacion_estado_siguienteIntentoAt_idx" ON "Notificacion"("estado", "siguienteIntentoAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notificacion_pedidoId_tipo_key" ON "Notificacion"("pedidoId", "tipo");

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

