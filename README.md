# Papelería M&M

Este es el proyecto para la **Papelería M&M**, una tienda en línea que permite a los clientes solicitar productos, realizar pedidos de impresiones y pagar con PayPal. El sistema también incluye funcionalidades de gestión de usuarios y eliminación de cuentas.

## Descripción

El objetivo del proyecto es proporcionar una plataforma interactiva para que los clientes de la papelería puedan:
- Solicitar productos o servicios.
- Pagar sus pedidos con PayPal.
- Gestionar su cuenta de usuario (crear, eliminar cuenta).
- Realizar solicitudes de impresiones.
- Hacer preguntas y dejar reseñas.

La aplicación está construida con una base de datos **MySQL** para manejar los usuarios, las impresiones y los pagos, entre otros datos relacionados.

## Tecnologías Utilizadas

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Base de datos**: MySQL
- **Otros**: PayPal API, GitHub, Git

## Funcionalidades

### Usuario

- **Registro y autenticación**: Los usuarios pueden registrarse y acceder a su cuenta.
- **Eliminar cuenta**: Los usuarios pueden eliminar su cuenta de forma permanente.
- **Gestionar impresiones**: Los usuarios pueden solicitar impresiones, ver el estado de las mismas y consultar su historial.
- **Solicitar productos u ofertas**: Los usuarios pueden seleccionar productos u ofertas y realizar el pago utilizando PayPal.
- **Preguntas y reseñas**: Los usuarios pueden hacer preguntas sobre la papeleria y dejar reseñas de esta misma o de manera general

### Administración

- **Gestión de impresiones**: Los administradores pueden ver las solicitudes de impresión y gestionar su estado.
- **Visualización de datos de usuarios**: Los administradores pueden consultar la información de los usuarios registrados y sus solicitudes.

## Estructura de la Base de Datos

Las tablas principales de la base de datos son:

- **Usuarios**: Información sobre los clientes de la papelería.
- **Preguntas**: Preguntas realizadas por los usuarios sobre productos o servicios.
- **Reseñas**: Opiniones y valoraciones de los usuarios.
- **Impresiones**: Información sobre las solicitudes de impresión realizadas por los usuarios.

## Instalación

### Requisitos

- Node.js
- MySQL
- Cuenta de PayPal para pruebas de pago

### Instrucciones

1. Clona este repositorio en tu máquina local:

   ```bash
   git clone https://github.com/usuario/PAPELERIAM&M.git
   cd PAPELERIAM&M
