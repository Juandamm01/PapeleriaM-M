// Función para actualizar el precio
function actualizarPrecio(productId, precioUnitario, cantidadInputId, totalId, paypalAmountId) {
    const cantidad = document.getElementById(cantidadInputId).value;
    const total = precioUnitario * cantidad;

    document.getElementById(totalId).textContent = '$' + total;


    document.getElementById(paypalAmountId).value = total / 4000;  // Ajustar a la conversión de moneda si es necesario
}


document.getElementById("cantidad-lapiz").addEventListener("input", function() {
    actualizarPrecio('lapiz', 500, 'cantidad-lapiz', 'total-lapiz', 'paypal-amount-lapiz');
});

document.getElementById("cantidad-sacapuntas").addEventListener("input", function() {
    actualizarPrecio('sacapuntas', 800, 'cantidad-sacapuntas', 'total-sacapuntas', 'paypal-amount-sacapuntas');
});

document.getElementById("cantidad-borrador").addEventListener("input", function() {
    actualizarPrecio('borrador', 1000, 'cantidad-borrador', 'total-borrador', 'paypal-amount-borrador');
});

document.getElementById("cantidad-lapicero").addEventListener("input", function() {
    actualizarPrecio('lapicero', 2000, 'cantidad-lapicero', 'total-lapicero', 'paypal-amount-lapicero');
});

document.getElementById("cantidad-cuaderno").addEventListener("input", function() {
    actualizarPrecio('cuaderno', 3000, 'cantidad-cuaderno', 'total-cuaderno', 'paypal-amount-cuaderno');
});

document.getElementById("cantidad-compas").addEventListener("input", function() {
    actualizarPrecio('compas', 4000, 'cantidad-compas', 'total-compas', 'paypal-amount-compas');
});

document.getElementById("cantidad-regla").addEventListener("input", function() {
    actualizarPrecio('regla', 7000, 'cantidad-regla', 'total-regla', 'paypal-amount-regla');
});

document.getElementById("cantidad-pegante").addEventListener("input", function() {
    actualizarPrecio('pegante', 1800, 'cantidad-pegante', 'total-pegante', 'paypal-amount-pegante');
});

document.getElementById("cantidad-carpeta").addEventListener("input", function() {
    actualizarPrecio('carpeta', 2000, 'cantidad-carpeta', 'total-carpeta', 'paypal-amount-carpeta');
});
