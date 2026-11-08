-- Impresión inteligente: páginas del PDF, selección, modo mixto, notas por página, cotización,
-- recogida por franjas y configuración editable (tarifas y horarios). Solo agrega columnas y tablas.
-- AlterEnum
ALTER TYPE "TipoImpresion" ADD VALUE 'MIXTO';

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "cotizacion" JSONB,
ADD COLUMN     "notasPaginas" JSONB,
ADD COLUMN     "paginasColor" TEXT,
ADD COLUMN     "paginasDocumento" INTEGER,
ADD COLUMN     "paginasImprimir" INTEGER,
ADD COLUMN     "paginasSeleccion" TEXT,
ADD COLUMN     "precioAutomatico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recogidaFin" TIMESTAMP(3),
ADD COLUMN     "recogidaInicio" TIMESTAMP(3),
ADD COLUMN     "whatsappAutorizado" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" TEXT NOT NULL DEFAULT 'principal',
    "tarifas" JSONB NOT NULL,
    "horarios" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pedido_recogidaInicio_idx" ON "Pedido"("recogidaInicio");

