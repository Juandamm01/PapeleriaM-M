document.getElementById('form').addEventListener('submit', function (e) {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const telefono = document.getElementById('telefono').value;
    const email = document.getElementById('email').value;

    fetch('http://localhost:3000/usuarios', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
},
    body: JSON.stringify({ nombre, telefono, email }),
    })
    .then(res => res.text())
    .then(data => {
        console.log('Usuario agregado:', data);
        document.getElementById('form').reset();
        cargarUsuarios(); // Recargar lista de usuarios
    })
    .catch(error => {
        console.error("Error al agregar usuario:", error);
        alert("Error al agregar usuario");
    });
});

  // Función para cargar usuarios y mostrarlos en la tabla
function cargarUsuarios() {
    fetch('http://localhost:3000/usuarios')
.then(res => res.json())
.then(usuarios => {
        const tabla = document.querySelector('#usuarios-table tbody');
        tabla.innerHTML = ''; // Limpiar tabla antes de agregar nuevos

        usuarios.forEach(usuario => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${usuario.nombre}</td>
            <td>${usuario.telefono}</td>
            <td>${usuario.email}</td>
        `;
        tabla.appendChild(fila);
        });
})
    .catch(error => {
        console.error("Error al obtener usuarios:", error);
});
}

  // Cargar usuarios al iniciar la página
document.addEventListener("DOMContentLoaded", cargarUsuarios);
