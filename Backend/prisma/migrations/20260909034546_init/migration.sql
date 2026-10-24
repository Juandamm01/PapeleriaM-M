-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('NEQUI', 'EFECTIVO');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('PENDIENTE', 'LISTO', 'ENTREGADO');

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "telefono" TEXT,
    "notas" TEXT,
    "archivoNombre" TEXT NOT NULL,
    "archivoRuta" TEXT NOT NULL,
    "tipoArchivo" TEXT NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);
