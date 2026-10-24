-- Retención de archivos y consentimiento de tratamiento de datos (Ley 1581 de 2012)
-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "archivosEliminadosAt" TIMESTAMP(3),
ADD COLUMN     "consentimientoAt" TIMESTAMP(3),
ADD COLUMN     "entregadoAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Pedido_archivosEliminadosAt_createdAt_idx" ON "Pedido"("archivosEliminadosAt", "createdAt");
