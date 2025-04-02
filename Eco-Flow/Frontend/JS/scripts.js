document.addEventListener('DOMContentLoaded', function() {
    // Inicializar el mapa con una vista predeterminada (se actualizará si hay geolocalización)
    var map = L.map('mapid').setView([3.4516, -76.5320], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Función para manejar la obtención exitosa de la ubicación
    function onLocationFound(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        
        // Centrar el mapa en la ubicación actual
        map.setView([lat, lng], 15);
        
        // Opcional: Añadir un pequeño indicador de "estás aquí"
        var locationMarker = L.circle([lat, lng], {
            color: '#4285F4',
            fillColor: '#4285F4',
            fillOpacity: 0.2,
            radius: 100  // Radio en metros
        }).addTo(map);
        
        // Mostrar un mensaje al usuario
        L.popup()
            .setLatLng([lat, lng])
            .setContent('Estás aquí')
            .openOn(map);
    }

    // Función para manejar errores de geolocalización
    function onLocationError(e) {
        console.warn('Error de geolocalización:', e.message);
        // Mantener la vista predeterminada si falla la geolocalización
    }

    // Intentar obtener la ubicación del usuario
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            onLocationFound,
            onLocationError,
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }

    // Initialize charts
    var barCtx = document.getElementById('bar-chart-canvas').getContext('2d');
    var lineCtx = document.getElementById('line-chart-canvas').getContext('2d');
    var pieCtx = document.getElementById('line-chart-canvas').getContext('2d');
    var vehiclePieCtx = document.getElementById('pie-chart-canvas').getContext('2d');

    var barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM'],
            datasets: [{
                label: 'Volumen de Trafico',
                data: [120, 150, 180, 200, 170, 160, 140],
                backgroundColor: 'rgba(75, 135, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });



    var vehiclePieChart = new Chart(vehiclePieCtx, {
        type: 'pie',
        data: {
            labels: ['Autos', 'Motos', 'Buses'],
            datasets: [{
                label: 'Distribucion Vehicular',
                data: [60, 25, 15],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: false
        }
    });

    // Referencias a elementos de entrada y sugerencias
    const puntoAInput = document.getElementById('punto-a');
    const puntoBInput = document.getElementById('punto-b');
    const sugerenciasADiv = document.getElementById('sugerencias-a');
    const sugerenciasBDiv = document.getElementById('sugerencias-b');

    // Variable para controlar el tiempo entre peticiones
    let timeoutId;

    // Función para obtener sugerencias de lugares
    function obtenerSugerencias(texto, sugerenciasDiv, inputElement) {
        if (texto.length < 3) {
            sugerenciasDiv.style.display = 'none';
            return;
        }

        // Cancelar cualquier petición previa pendiente
        clearTimeout(timeoutId);

        // Esperar 300ms después de que el usuario deje de escribir para hacer la petición
        timeoutId = setTimeout(() => {
            const apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(texto)}&limit=5`;
            
            fetch(apiUrl)
                .then(response => response.json())
                .then(data => {
                    // Limpiar sugerencias previas
                    sugerenciasDiv.innerHTML = '';
                    
                    if (data.length === 0) {
                        sugerenciasDiv.style.display = 'none';
                        return;
                    }

                    // Mostrar cada sugerencia
                    data.forEach(lugar => {
                        const sugerenciaItem = document.createElement('div');
                        sugerenciaItem.className = 'sugerencia-item';

                        // Extraer nombre principal y dirección secundaria
                        const nombrePrincipal = lugar.display_name.split(',')[0];
                        const direccionSecundaria = lugar.display_name.substring(nombrePrincipal.length + 1);

                        sugerenciaItem.innerHTML = `
                            <div class="sugerencia-principal">${nombrePrincipal}</div>
                            <div class="sugerencia-secundaria">${direccionSecundaria}</div>
                        `;

                        // Al hacer clic, llenar el campo de entrada con esta sugerencia
                        sugerenciaItem.addEventListener('click', () => {
                            inputElement.value = lugar.display_name;
                            sugerenciasDiv.style.display = 'none';
                            
                            // Guardar las coordenadas como datos personalizados en el input
                            inputElement.dataset.lat = lugar.lat;
                            inputElement.dataset.lng = lugar.lon;
                        });

                        sugerenciasDiv.appendChild(sugerenciaItem);
                    });

                    // Mostrar el panel de sugerencias
                    sugerenciasDiv.style.display = 'block';
                })
                .catch(error => {
                    console.error('Error al obtener sugerencias:', error);
                    sugerenciasDiv.style.display = 'none';
                });
        }, 300);
    }

    // Escuchar eventos de entrada en los campos
    puntoAInput.addEventListener('input', () => {
        obtenerSugerencias(puntoAInput.value, sugerenciasADiv, puntoAInput);
    });

    puntoBInput.addEventListener('input', () => {
        obtenerSugerencias(puntoBInput.value, sugerenciasBDiv, puntoBInput);
    });

    // Cerrar las sugerencias cuando se hace clic fuera de ellas
    document.addEventListener('click', (e) => {
        if (!puntoAInput.contains(e.target) && !sugerenciasADiv.contains(e.target)) {
            sugerenciasADiv.style.display = 'none';
        }
        if (!puntoBInput.contains(e.target) && !sugerenciasBDiv.contains(e.target)) {
            sugerenciasBDiv.style.display = 'none';
        }
    });

    // Modificar el evento del botón buscar ruta para usar las coordenadas almacenadas
    const buscarRutaBtn = document.getElementById('buscar-ruta');
    buscarRutaBtn.addEventListener('click', function() {
        const origenNombre = puntoAInput.value.trim();
        const destinoNombre = puntoBInput.value.trim();
        
        if (!origenNombre || !destinoNombre) {
            alert('Por favor, ingresa tanto el origen como el destino');
            return;
        }
        
        // Mostrar indicador de carga
        buscarRutaBtn.textContent = 'Buscando...';
        buscarRutaBtn.disabled = true;
        
        // Función para buscar ubicación si no hay coordenadas guardadas
        function geocodificarSiNecesario(inputElement, nombreLugar, callback) {
            if (inputElement.dataset.lat && inputElement.dataset.lng) {
                // Usar coordenadas guardadas de la sugerencia seleccionada
                callback(null, {
                    lat: parseFloat(inputElement.dataset.lat),
                    lng: parseFloat(inputElement.dataset.lng),
                    displayName: nombreLugar
                });
            } else {
                // Realizar geocodificación si no hay coordenadas guardadas
                geocodeLocation(nombreLugar, callback);
            }
        }
        
        // Geocodificar origen (o usar coordenadas guardadas)
        geocodificarSiNecesario(puntoAInput, origenNombre, (errorOrigen, origen) => {
            if (errorOrigen) {
                alert(`Error al buscar el origen: ${errorOrigen}`);
                resetButton();
                return;
            }
            
            // Geocodificar destino (o usar coordenadas guardadas)
            geocodificarSiNecesario(puntoBInput, destinoNombre, (errorDestino, destino) => {
                if (errorDestino) {
                    alert(`Error al buscar el destino: ${errorDestino}`);
                    resetButton();
                    return;
                }
                
                // Continúa con la creación de la ruta como antes...
                const puntoA = L.latLng(origen.lat, origen.lng);
                const puntoB = L.latLng(destino.lat, destino.lng);
                
                // Eliminar ruta anterior si existe
                if (window.rutaControl) {
                    map.removeControl(window.rutaControl);
                }
                
                // Eliminar marcadores anteriores si existen
                if (window.marcadorA) map.removeLayer(window.marcadorA);
                if (window.marcadorB) map.removeLayer(window.marcadorB);
                
                // Crear nueva ruta
                window.marcadorA = L.marker(puntoA, {draggable: true})
                    .addTo(map)
                    .bindPopup(origen.displayName);
                    
                window.marcadorB = L.marker(puntoB, {draggable: true})
                    .addTo(map)
                    .bindPopup(destino.displayName);
                
                window.rutaControl = L.Routing.control({
                    waypoints: [puntoA, puntoB],
                    routeWhileDragging: true,
                    showAlternatives: true,
                    lineOptions: {
                        styles: [{color: '#007bff', opacity: 0.7, weight: 6}]
                    },
                    altLineOptions: {
                        styles: [{color: '#6c757d', opacity: 0.6, weight: 4}]
                    },
                    show: false,           // Oculta completamente el panel de indicaciones
                    collapsible: true,     // Permite que el panel sea colapsable (por si lo necesitas en el futuro)
                    fitSelectedRoutes: true,
                    createMarker: function() { return null; } // Evita la creación de marcadores adicionales
                }).addTo(map);

                // Si aún aparece el panel de indicaciones, puedes ocultarlo manualmente después de crearlo
                if (document.querySelector('.leaflet-routing-container')) {
                    document.querySelector('.leaflet-routing-container').style.display = 'none';
                }
                
                // Ajustar la vista del mapa para mostrar toda la ruta
                const bounds = L.latLngBounds(puntoA, puntoB);
                map.fitBounds(bounds, { padding: [50, 50] });
                
                resetButton();
                
                // Actualizar el gráfico de línea con información de la ruta
                actualizarGraficoConRuta(origen.displayName, destino.displayName);
            });
        });
        
        function resetButton() {
            buscarRutaBtn.textContent = 'Buscar ruta';
            buscarRutaBtn.disabled = false;
        }
    });

    // Función para actualizar el gráfico de línea con datos de la ruta
    function actualizarGraficoConRuta(origenNombre, destinoNombre) {
        const lineCtx = document.getElementById('line-chart-canvas').getContext('2d');
        
        // Generar datos de ejemplo para la ruta (esto podrías reemplazarlo con datos reales)
        const distancias = [0, 2, 5, 8, 12, 15];
        const tiempos = [0, 5, 10, 15, 20, 25];
        
        // Actualizar o crear el gráfico
        if (window.lineChart) {
            window.lineChart.destroy();
        }
        
        window.lineChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: distancias.map(d => `${d} km`),
                datasets: [{
                    label: `Tiempo de viaje: ${origenNombre} → ${destinoNombre}`,
                    data: tiempos,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Análisis de tiempo de viaje'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Tiempo: ${context.raw} min`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Distancia (km)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Tiempo (minutos)'
                        }
                    }
                }
            }
        });
    }
});

