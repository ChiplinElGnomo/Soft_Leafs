// VARIABLES BASE DE EXPERIENCIA//
let xp_actual = 0;
let xp_ganada_hoy = 0;
let xp_max_nivel = 1000;
let nivel_actual = 1;
const crecimiento_nivel = 1.2;
let xp_pagina = 20;
let tiempo_actual = Date.now() / 1000;

// VARIABLES ANTI-TRAMPA//
let xp_max_dia = 600;
const tiempo_min = 10;
let contador_tiempo_paginas = Date.now() / 1000;

window.addEventListener("paginaCambiada", (e) => {
    // ACTUALIZACIÓN GLOBAL: Aquí capturamos el tiempo del evento y lo metemos en la variable de arriba
    tiempo_actual = e.detail.timestamp; 
    actualizarExperiencia();
});

async function cargarDatosDesdeDB() {
    const datos = await window.electronAPI.obtenerDatosUsuario();
    if (datos) {
        nivel_actual = datos.nivel_actual;
        xp_actual = datos.xp_actual;
        xp_max_nivel = datos.xp_max_nivel;
        xp_ganada_hoy = datos.xp_ganada_hoy;
        
        // Disparamos la barra inicialmente para que no aparezca vacía al cargar la app
        refrescarInterfaz();
    }
}
cargarDatosDesdeDB();



export function actualizarExperiencia() {
    
    const diferencia_tiempo = tiempo_actual - contador_tiempo_paginas;

    if (diferencia_tiempo < tiempo_min ) {
        contador_tiempo_paginas = tiempo_actual;
        return; 
    };
    if (xp_ganada_hoy >= xp_max_dia) {
        return;
    };

    contador_tiempo_paginas = tiempo_actual;
    xp_ganada_hoy += xp_pagina
    xp_actual += xp_pagina;

    if (xp_actual >= xp_max_nivel) {
        xp_actual -= xp_max_nivel;
        nivel_actual += 1;
        xp_max_nivel = Math.round(xp_max_nivel * crecimiento_nivel);
    };

    // 1. GUARDADO EN BASE DE DATOS
    window.electronAPI.guardarDatosUsuario({
        nivel_actual,
        xp_actual,
        xp_max_nivel,
        xp_ganada_hoy
    });

    // 2. LLAMADA A LA FUNCIÓN DE INTERFAZ
    // Esta función sustituye al dispatchEvent que tenías antes
    refrescarInterfaz(); 
};

function refrescarInterfaz() {
    const porcentajeProgreso = (xp_actual / xp_max_nivel) * 100;

    window.dispatchEvent(new CustomEvent("actualizarBarra", {
        detail: { 
            porcentaje: porcentajeProgreso, 
            xp_actual: Math.floor(xp_actual), 
            xp_max: xp_max_nivel,             
            nivel: nivel_actual 
        }
    }));
}













//Usar el return solo funciona como freno, osea que el codigo inferior a el no se ejecuta.
// El operador += es importante porque guarda el valor en la variable, si usas solo el + no lo guarda, solo opera.
