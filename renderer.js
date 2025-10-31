document.addEventListener('DOMContentLoaded', () => {
  // Botón salir
  const btnCerrar = document.querySelectorAll('.btn')[2];
  btnCerrar.addEventListener('click', () => {
    window.electronAPI.cerrarApp();
  });

  // Modal Opciones
  const btnOpciones = document.getElementById('btnOpciones');
  const ventanaInterna = document.getElementById('ventanaInterna');
  const btnVolver = document.getElementById('btnVolver');

  btnOpciones.addEventListener('click', () => {
    ventanaInterna.classList.add('mostrar');
  });

  btnVolver.addEventListener('click', () => {
    ventanaInterna.classList.remove('mostrar');
  });

  // Modal Biblioteca
  const btnBiblio = document.getElementById('btnBiblio');
  const ventanaBiblio = document.getElementById('ventanaBiblio');
  const btnVolverBiblio = document.getElementById('btnVolverBiblio');

  btnBiblio.addEventListener('click', () => {
    ventanaBiblio.classList.add('mostrar');
  });

  btnVolverBiblio.addEventListener('click', () => {
    ventanaBiblio.classList.remove('mostrar');
  });
});

