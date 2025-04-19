// Función para calcular el precio total
function calcularPrecio() {
    const cantidad = parseInt(document.getElementById('cantidad').value);  // Obtiene la cantidad de hojas y la convierte en número
    const tipo = document.getElementById('tipo').value;          // Obtiene el tipo de impresión (blanco y negro o color)
    let precioPorHoja;

    // Verifica si la cantidad es un número válido
    if (isNaN(cantidad) || cantidad <= 0) {
        document.getElementById('precio').value = ''; // Limpia el precio si la cantidad no es válida
        return;
    }

    // Define el precio por hoja según el tipo de impresión
    if (tipo === 'blanco_negro') {
        precioPorHoja = 500; // Blanco y negro
    } else {
        precioPorHoja = 800; // A color
    }

    // Calcula el precio total
    const precioTotal = cantidad * precioPorHoja;

    // Muestra el precio total en el campo de texto correspondiente
    document.getElementById('precio').value = `$${precioTotal.toFixed(2)}`;
}

// Función para enviar los datos de la impresión al backend
function registrarImpresion(event) {
    event.preventDefault();  // Evita el envío del formulario por defecto
    const id_usuario = localStorage.getItem('id_usuario');
    const tipo_impresion = document.getElementById('tipo').value;    // Tipo de impresión
    const cantidad = parseInt(document.getElementById('cantidad').value); // Cantidad de impresiones
    const precio = parseFloat(document.getElementById('precio').value.replace('$', '').replace(',', ''));  // Precio total
    const documento = document.getElementById('documento').files[0];  // Documento cargado (si aplica)

    // Validación básica de los datos
    if (isNaN(precio) || precio <= 0) {
        alert("El precio calculado no es válido.");
        return;
    }

    if (isNaN(cantidad) || cantidad <= 0) {
        alert("Por favor, ingresa una cantidad válida.");
        return;
    }

    // Validación del archivo
    if (!documento) {
        alert("Por favor, selecciona un documento para imprimir.");
        return;
    }

    // Crear un objeto FormData para enviar el archivo junto con los demás datos
    const formData = new FormData();
    formData.append('tipo_impresion', tipo_impresion);
    formData.append('cantidad', cantidad);
    formData.append('precio', precio);
    formData.append('documento', documento);

    // Enviar los datos al backend utilizando fetch
    fetch('http://localhost:3000/registrar-impresion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'  // ⬅️ Esto le dice al servidor que es JSON
        },
        body: JSON.stringify({
            id_usuario,
            tipo_impresion,
            cantidad,
            precio
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.mensaje === "Impresión registrada con éxito") {
            alert("La impresión se ha registrado correctamente.");
            document.getElementById('formulario-impresion').reset();
        } else {
            alert("Error al registrar la impresión.");
        }
    })
    .catch(error => {
        console.error("Error al conectar con el servidor:", error);
        alert("Hubo un problema al registrar la impresión.");
    });
}

// Asocia el evento para calcular el precio cuando se cambian los valores
document.getElementById('cantidad').addEventListener('input', calcularPrecio);
document.getElementById('tipo').addEventListener('change', calcularPrecio);

// Asocia el evento para enviar el formulario
document.getElementById('formulario-impresion').addEventListener('submit', registrarImpresion);
