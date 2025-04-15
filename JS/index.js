document.getElementById('form').addEventListener('submit', function (e) {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const telefono = document.getElementById('telefono').value;
    const email = document.getElementById('email').value;
    const usuario = document.getElementById('usuario').value;
    const contraseña = document.getElementById('contraseña').value;
    
    fetch('http://localhost:3000/usuarios', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre, telefono, email, usuario, contraseña }),
    })
    .then(res => res.text())
    .then(data => {
        console.log('Usuario agregado:', data);
        document.getElementById('form').reset();
        document.getElementById('mensaje').textContent = "¡Usuario registrado con éxito!";
        setTimeout(() => {
            window.location.href = 'login.html'; // Redirige al login
        }, 1500);   
    })
    .catch(error => {
        console.error("Error al agregar usuario:", error);
        alert("Error al agregar usuario");
    });
});
