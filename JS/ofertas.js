let carrito = [];
    const listaCarrito = document.getElementById("lista-carrito");
    const totalElemento = document.getElementById("total");
    const botonPagar = document.getElementById("boton-pagar");

    function agregarAlCarrito(nombre, precio) {
      carrito.push({ nombre, precio });
      actualizarCarrito();
    }

    function actualizarCarrito() {
      listaCarrito.innerHTML = "";
      let total = 0;
      carrito.forEach((item, index) => {
        const li = document.createElement("li");
        li.textContent = `${item.nombre} - $${item.precio}`;
        listaCarrito.appendChild(li);
        total += item.precio;
      });
      totalElemento.textContent = `Total: $${total} COP`;

      botonPagar.style.display = carrito.length > 0 ? "inline-block" : "none";
    }

    function vaciarCarrito() {
      carrito = [];
      actualizarCarrito();
    }

    function crearInput(name, value) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      return input;
    }

    function pagarCarrito() {
      const form = document.createElement("form");
      form.action = "https://www.sandbox.paypal.com/cgi-bin/webscr";
      form.method = "post";
      form.target = "_top";

      form.appendChild(crearInput("cmd", "_cart"));
      form.appendChild(crearInput("upload", "1"));
      form.appendChild(crearInput("business", "tu-vendedor@correo.com")); // <-- CAMBIA ESTO POR TU CUENTA PAYPAL SANDBOX
      form.appendChild(crearInput("currency_code", "USD"));

      carrito.forEach((item, index) => {
        const i = index + 1;
        form.appendChild(crearInput(`item_name_${i}`, item.nombre));
        form.appendChild(crearInput(`amount_${i}`, (item.precio / 4000).toFixed(2))); // 4000 COP ≈ 1 USD (ajusta si quieres)
        form.appendChild(crearInput(`quantity_${i}`, "1"));
      });

      document.body.appendChild(form);
      form.submit();
    }