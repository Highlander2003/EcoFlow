// Añadir al principio para depuración
console.log("Cargando scripts.js");

// Variables globales
let map; // El mapa de Leaflet
let routeWaypoints = []; // Puntos de la ruta
let currentMarkers = []; // Marcadores en el mapa
let currentRouteLayer = null; // Capa de la ruta actual
let selectedVehicleType = 'car'; // Tipo de vehículo seleccionado por defecto

// Variables para la animación de ruta
let routeAnimationMarker = null;
let routeAnimationPath = [];
let routeAnimationIndex = 0;
let routeAnimationTimer = null;
let routeAnimationSpeed = 50; // ms entre cada paso
let isAnimationPlaying = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM cargado completamente");
    
    // Inicializar mapa si está en la página principal
    if (document.getElementById('map')) {
        console.log("Elemento mapa encontrado, inicializando...");
        initMap();
    } else {
        console.error("No se encontró el elemento #map");
    }
    
    // Configurar búsqueda y rutas si estamos en la página principal
    if (document.getElementById('search-input')) {
        setupRouteControls();
    }
    
    // Configurar opciones de transporte
    setupTransportOptions();
    
    // Configurar botón de ubicación actual
    setupLocationButton();
});

// Inicializa el mapa de Leaflet
function initMap() {
    console.log("Inicializando mapa...");
    try {
        // Centrar en una ubicación predeterminada en Cali, Colombia
        const defaultLocation = [3.4516, -76.5320]; // Cali, Colombia
        
        // Crear mapa
        map = L.map('map').setView(defaultLocation, 13);
        
        // Añadir capa de OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
        
        console.log("Mapa inicializado correctamente");
        
        // Añadir un marcador para comprobar que el mapa funciona
        L.marker(defaultLocation).addTo(map)
            .bindPopup('Cali, Colombia')
            .openPopup();
    } catch (error) {
        console.error("Error al inicializar el mapa:", error);
    }
}

// Configura controles de ruta y búsqueda
function setupRouteControls() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const optimizeButton = document.getElementById('optimize-route');
    
    // Manejar clic en botón de búsqueda
    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            searchPlaces(query).then(displaySearchResults);
        }
    });
    
    // Manejar presionar Enter en la búsqueda
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                searchPlaces(query).then(displaySearchResults);
            }
        }
    });
    
    // Manejar clic en botón de optimizar
    if (optimizeButton) {
        optimizeButton.addEventListener('click', optimizeAndDisplayRoute);
    }
}

// Configura las opciones de transporte
function setupTransportOptions() {
    const transportOptions = document.querySelectorAll('.transport-option');
    
    if (transportOptions.length > 0) {
        transportOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Actualizar selección visual
                transportOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // Actualizar tipo de vehículo seleccionado
                selectedVehicleType = option.getAttribute('data-type');
                
                // Recalcular ruta con el nuevo tipo de vehículo
                if (routeWaypoints.length >= 2) {
                    calculateAndDisplayRoute();
                }
            });
        });
    }
}

// Función para mostrar resultados de búsqueda
function displaySearchResults(places) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';
    
    if (!places || places.length === 0) {
        resultsContainer.innerHTML = '<p>No se encontraron resultados</p>';
        return;
    }
    
    const ul = document.createElement('ul');
    ul.className = 'places-list';
    
    places.forEach(place => {
        const li = document.createElement('li');
        li.className = 'place-item';
        li.innerHTML = `
            <span class="place-name">${place.name}</span>
            <button class="btn-add-waypoint">Añadir</button>
        `;
        
        li.querySelector('.btn-add-waypoint').addEventListener('click', () => {
            addWaypoint(place);
            resultsContainer.innerHTML = '';
        });
        
        ul.appendChild(li);
    });
    
    resultsContainer.appendChild(ul);
}

// Función para buscar lugares usando Nominatim (OpenStreetMap)
async function searchPlaces(query) {
    console.log("Buscando lugares:", query);
    
    try {
        // Añadir "Cali, Colombia" a la búsqueda para contexto local
        const searchQuery = `${query}, Cali, Colombia`;
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
        
        if (!response.ok) {
            throw new Error(`Error en la búsqueda: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Resultados de búsqueda:", data);
        
        // Transformar los resultados al formato esperado
        return data.map(item => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            type: 'search_result'
        }));
    } catch (error) {
        console.error("Error al buscar lugares:", error);
        return [];
    }
}

// Función para añadir un waypoint a la ruta, con soporte para arrastrar
function addWaypoint(place) {
    routeWaypoints.push(place);
    updateWaypointsList();
    
    // Añadir marcador al mapa y hacerlo arrastrable
    if (map) {
        const marker = L.marker([place.lat, place.lon], {
            draggable: true // Hacer el marcador arrastrable
        }).addTo(map)
          .bindPopup(place.name);
        
        // Índice del waypoint actual
        const waypointIndex = routeWaypoints.length - 1;
        
        // Agregar listener para cuando termina de arrastrarse
        marker.on('dragend', function(event) {
            // Obtener nueva posición
            const position = marker.getLatLng();
            
            // Actualizar coordenadas en el array de waypoints
            routeWaypoints[waypointIndex].lat = position.lat;
            routeWaypoints[waypointIndex].lon = position.lng;
            
            // Actualizar etiqueta de popup si es necesario
            marker.bindPopup(routeWaypoints[waypointIndex].name);
            
            // Recalcular ruta con los puntos actualizados
            if (routeWaypoints.length >= 2) {
                calculateAndDisplayRoute();
            }
            
            // Actualizar la lista visual de waypoints
            updateWaypointsList();
        });
        
        currentMarkers.push(marker);
        
        // Centrar mapa en el nuevo punto
        map.setView([place.lat, place.lon], 13);
    }
    
    // Si tenemos al menos dos puntos, calcular la ruta
    if (routeWaypoints.length >= 2) {
        calculateAndDisplayRoute();
    }
}

// Función para actualizar la lista visual de waypoints
function updateWaypointsList() {
    const waypointsContainer = document.getElementById('waypoints-list');
    if (!waypointsContainer) return;
    
    waypointsContainer.innerHTML = '';
    
    routeWaypoints.forEach((waypoint, index) => {
        const waypointElement = document.createElement('div');
        waypointElement.className = 'waypoint-item';
        
        // Agregar información sobre la capacidad de arrastrar
        waypointElement.innerHTML = `
            <span class="waypoint-number">${index + 1}</span>
            <span class="waypoint-name">${waypoint.name}</span>
            <span class="waypoint-drag-hint">🔄</span>
            <button class="btn-remove-waypoint" data-index="${index}">🗑️</button>
        `;
        
        // Permitir reordenar los waypoints (opcional)
        waypointElement.setAttribute('draggable', 'true');
        waypointElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', index);
        });
        
        waypointsContainer.appendChild(waypointElement);
    });
    
    // Añadir event listeners para los botones de eliminar
    document.querySelectorAll('.btn-remove-waypoint').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            
            // Eliminar el marcador del mapa
            if (currentMarkers[index]) {
                map.removeLayer(currentMarkers[index]);
                currentMarkers.splice(index, 1);
            }
            
            // Eliminar el waypoint de la lista
            routeWaypoints.splice(index, 1);
            
            updateWaypointsList();
            
            // Recalcular ruta si aún hay suficientes puntos
            if (routeWaypoints.length >= 2) {
                calculateAndDisplayRoute();
            } else if (currentRouteLayer) {
                // Eliminar ruta del mapa si no hay suficientes puntos
                map.removeLayer(currentRouteLayer);
                currentRouteLayer = null;
                
                // Limpiar estadísticas
                const statsContainer = document.getElementById('route-stats');
                if (statsContainer) {
                    statsContainer.innerHTML = `
                        <div class="no-route-message">
                            Selecciona puntos en el mapa para calcular una ruta
                        </div>
                    `;
                }
            }
        });
    });
    
    // Permitir soltar elementos para reordenar (opcional)
    waypointsContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    waypointsContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const toElement = e.target.closest('.waypoint-item');
        
        if (!toElement) return;
        
        const toIndex = Array.from(waypointsContainer.children).indexOf(toElement);
        
        if (fromIndex !== toIndex) {
            // Reordenar waypoints
            const [movedWaypoint] = routeWaypoints.splice(fromIndex, 1);
            routeWaypoints.splice(toIndex, 0, movedWaypoint);
            
            // Reordenar marcadores
            const [movedMarker] = currentMarkers.splice(fromIndex, 1);
            currentMarkers.splice(toIndex, 0, movedMarker);
            
            updateWaypointsList();
            
            // Recalcular ruta con el nuevo orden
            if (routeWaypoints.length >= 2) {
                calculateAndDisplayRoute();
            }
        }
    });
}

// Función para calcular ruta entre dos puntos
async function calculateRoute(start, end, vehicleType = 'car') {
    console.log(`Calculando ruta de ${start.name} a ${end.name} usando ${vehicleType}`);
    
    try {
        // URL para la API de rutas OSRM (OpenStreetMap Routing Machine)
        const osrmUrl = `https://router.project-osrm.org/route/v1/${vehicleType}/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`;
        
        const response = await fetch(osrmUrl);
        
        if (!response.ok) {
            throw new Error(`Error al calcular ruta: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Resultado de la ruta:", data);
        
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            
            // Convertir la geometría GeoJSON a formato de puntos {lat, lon}
            const path = route.geometry.coordinates.map(coord => ({
                lat: coord[1],
                lon: coord[0]
            }));
            
            // Crear objeto de ruta con la información relevante
            return {
                path: path,
                distance: route.distance / 1000, // convertir de metros a kilómetros
                duration: route.duration / 60, // convertir de segundos a minutos
                emissions: calculateEmissions(route.distance / 1000, vehicleType)
            };
        } else {
            throw new Error("No se encontró ninguna ruta");
        }
    } catch (error) {
        console.error("Error al calcular ruta:", error);
        alert("No se pudo calcular la ruta. Intenta con otros puntos.");
        return null;
    }
}

// Función para calcular emisiones de CO2 basadas en la distancia y el tipo de vehículo
function calculateEmissions(distanceKm, vehicleType) {
    // Factores de emisión en kg CO2 por km (valores aproximados)
    const emissionFactors = {
        car: 0.12,         // Automóvil promedio
        bike: 0,           // Bicicleta (0 emisiones)
        foot: 0,           // A pie (0 emisiones)
        bus: 0.08,         // Autobús
        motorcycle: 0.07   // Motocicleta
    };
    
    // Usar factor por defecto si el tipo de vehículo no está definido
    const factor = emissionFactors[vehicleType] || emissionFactors.car;
    
    return distanceKm * factor;
}

// Función para optimizar ruta con múltiples paradas
async function optimizeRoute(waypoints, vehicleType = 'car') {
    // Esta es una versión simplificada que solo calcula la ruta en el orden proporcionado
    // Una optimización real requeriría un algoritmo más complejo (TSP)
    
    if (waypoints.length < 2) return null;
    
    try {
        // Construir la cadena de coordenadas para la API
        const coordinates = waypoints.map(wp => `${wp.lon},${wp.lat}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/${vehicleType}/${coordinates}?overview=full&geometries=geojson`;
        
        const response = await fetch(osrmUrl);
        
        if (!response.ok) {
            throw new Error(`Error al optimizar ruta: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            
            // Convertir la geometría GeoJSON a formato de puntos {lat, lon}
            const path = route.geometry.coordinates.map(coord => ({
                lat: coord[1],
                lon: coord[0]
            }));
            
            // Crear objeto de ruta con la información relevante
            return {
                path: path,
                distance: route.distance / 1000, // convertir de metros a kilómetros
                duration: route.duration / 60, // convertir de segundos a minutos
                emissions: calculateEmissions(route.distance / 1000, vehicleType)
            };
        } else {
            throw new Error("No se encontró ninguna ruta optimizada");
        }
    } catch (error) {
        console.error("Error al optimizar ruta:", error);
        alert("No se pudo optimizar la ruta. Intenta con otros puntos.");
        return null;
    }
}

// Función para actualizar datos del gráfico de emisiones
function updateEmissionsChartData(emissions, vehicleType) {
    // Buscar el contenedor del gráfico
    const chartContainer = document.getElementById('emissions-chart');
    if (!chartContainer) return;
    
    // Datos de emisiones para comparar con otros modos de transporte
    const carEmissions = emissions / (vehicleType === 'car' ? 1 : calculateEmissions(emissions, 'car'));
    const busEmissions = emissions / (vehicleType === 'bus' ? 1 : calculateEmissions(emissions, 'bus'));
    const motorcycleEmissions = emissions / (vehicleType === 'motorcycle' ? 1 : calculateEmissions(emissions, 'motorcycle'));
    
    // Si ya existe un gráfico, destruirlo
    if (window.emissionsChart) {
        window.emissionsChart.destroy();
    }
    
    // Crear nuevo gráfico
    const ctx = chartContainer.getContext('2d');
    window.emissionsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Auto', 'Bus', 'Moto', 'Bici/Pie'],
            datasets: [{
                label: 'Emisiones de CO2 (kg)',
                data: [carEmissions, busEmissions, motorcycleEmissions, 0],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Emisiones CO2 (kg)'
                    }
                }
            }
        }
    });
}

// Función para calcular y mostrar la ruta actual
async function calculateAndDisplayRoute() {
    if (routeWaypoints.length < 2) return;
    
    // Si solo hay dos puntos, calculamos ruta directa
    if (routeWaypoints.length === 2) {
        const route = await calculateRoute(
            routeWaypoints[0], 
            routeWaypoints[1], 
            selectedVehicleType
        );
        
        if (route) {
            displayRoute(route);
            updateRouteStats(route);
            updateEmissionsChartData(route.emissions || 0, selectedVehicleType);
        }
    } else {
        // Si hay más de dos puntos, usamos la última optimización o calculamos ruta directa
        // entre primer y último punto como fallback
        const route = await calculateRoute(
            routeWaypoints[0], 
            routeWaypoints[routeWaypoints.length - 1], 
            selectedVehicleType
        );
        
        if (route) {
            displayRoute(route);
            updateRouteStats(route);
            updateEmissionsChartData(route.emissions || 0, selectedVehicleType);
        }
    }
}

// Función para optimizar y mostrar la ruta con múltiples paradas
async function optimizeAndDisplayRoute() {
    if (routeWaypoints.length < 3) return;
    
    const optimizedRoute = await optimizeRoute(routeWaypoints, selectedVehicleType);
    if (optimizedRoute) {
        displayRoute(optimizedRoute);
        updateRouteStats(optimizedRoute);
        updateEmissionsChartData(optimizedRoute.emissions || 0, selectedVehicleType);
    }
}

// Función para mostrar la ruta en el mapa
function displayRoute(route) {
    // Limpiar rutas anteriores
    if (currentRouteLayer) {
        map.removeLayer(currentRouteLayer);
    }
    
    // Detener cualquier animación en curso
    stopRouteAnimation();
    
    // Crear array de coordenadas para la ruta
    const routeCoordinates = route.path.map(point => [point.lat, point.lon]);
    
    // Crear una polilínea para la ruta
    currentRouteLayer = L.polyline(routeCoordinates, {
        color: '#0e7c7b',
        weight: 6,
        opacity: 0.7
    }).addTo(map);
    
    // Ajustar el mapa para mostrar toda la ruta
    if (routeCoordinates.length > 0) {
        map.fitBounds(currentRouteLayer.getBounds(), {
            padding: [50, 50]
        });
    }
    
    // Guardar la ruta para la animación
    routeAnimationPath = routeCoordinates;
    
    // Crear y agregar el botón de animación
    addAnimationButton();
}

// Función para agregar el botón de animación
function addAnimationButton() {
    // Eliminar botón previo si existe
    removeAnimationButton();
    
    // Crear el nuevo botón
    const animationButton = document.createElement('div');
    animationButton.id = 'route-animation-button';
    animationButton.className = 'route-animation-button';
    animationButton.innerHTML = '<span>▶️ Simular recorrido</span>';
    animationButton.title = 'Ver animación de la ruta';
    
    // Agregar evento
    animationButton.addEventListener('click', animateRoute);
    
    // Añadir al contenedor del mapa
    document.querySelector('.map-container').appendChild(animationButton);
}

// Función para eliminar el botón de animación
function removeAnimationButton() {
    const existingButton = document.getElementById('route-animation-button');
    if (existingButton) {
        existingButton.remove();
    }
}

// Función para actualizar las estadísticas de la ruta
function updateRouteStats(route) {
    const statsContainer = document.getElementById('route-stats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Distancia:</span>
            <span class="stat-value">${route.distance ? route.distance.toFixed(2) : route.total_distance.toFixed(2)} km</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Tiempo estimado:</span>
            <span class="stat-value">${route.duration ? route.duration.toFixed(0) : route.estimated_time.toFixed(0)} min</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Emisiones de CO2:</span>
            <span class="stat-value">${route.emissions ? route.emissions.toFixed(2) : '0.00'} kg</span>
        </div>
    `;
}

// Función para configurar el botón de ubicación actual
function setupLocationButton() {
    const locationButton = document.getElementById('use-current-location');
    
    if (!locationButton) return;
    
    // Verificar si el navegador soporta geolocalización
    if (!navigator.geolocation) {
        locationButton.disabled = true;
        locationButton.innerHTML = 'Geolocalización no soportada';
        return;
    }
    
    locationButton.addEventListener('click', getUserLocation);
}

// Función para obtener la ubicación del usuario
function getUserLocation() {
    const locationButton = document.getElementById('use-current-location');
    
    // Cambiar estado del botón
    locationButton.disabled = true;
    locationButton.innerHTML = '<span class="location-icon">⏳</span> Obteniendo ubicación...';
    
    // Opciones para la geolocalización
    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };
    
    // Solicitar ubicación
    navigator.geolocation.getCurrentPosition(
        handleLocationSuccess,
        handleLocationError,
        options
    );
}

// Función para manejar éxito en la geolocalización
function handleLocationSuccess(position) {
    const locationButton = document.getElementById('use-current-location');
    locationButton.disabled = false;
    locationButton.innerHTML = '<span class="location-icon">📍</span> Usar mi ubicación';
    
    // Obtener coordenadas
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    
    // Crear un objeto de ubicación
    const currentLocation = {
        name: "Mi ubicación actual",
        lat: lat,
        lon: lon,
        type: "current_location"
    };
    
    // Añadir como waypoint y centrar mapa
    addWaypoint(currentLocation);
    
    // Centrar mapa en la ubicación
    if (map) {
        map.setView([lat, lon], 15);
    }
}

// Función para manejar error en la geolocalización
function handleLocationError(error) {
    const locationButton = document.getElementById('use-current-location');
    locationButton.disabled = false;
    locationButton.innerHTML = '<span class="location-icon">📍</span> Usar mi ubicación';
    
    let errorMessage = '';
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado.';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible.';
            break;
        case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado para obtener ubicación.';
            break;
        case error.UNKNOWN_ERROR:
            errorMessage = 'Error desconocido al obtener ubicación.';
            break;
    }
    
    // Mostrar mensaje de error
    const locationContainer = document.querySelector('.location-container');
    const errorElement = document.createElement('div');
    errorElement.className = 'location-error';
    errorElement.textContent = errorMessage;
    
    // Eliminar mensajes de error previos
    const prevError = locationContainer.querySelector('.location-error');
    if (prevError) prevError.remove();
    
    locationContainer.appendChild(errorElement);
    
    // Eliminar mensaje después de 5 segundos
    setTimeout(() => {
        if (errorElement.parentNode) {
            errorElement.remove();
        }
    }, 5000);
}

// Función para iniciar la animación de ruta
function animateRoute() {
    // Si ya hay una animación en curso, la pausamos o reanudamos
    if (routeAnimationMarker) {
        toggleAnimation();
        return;
    }
    
    // Reiniciar índice de animación
    routeAnimationIndex = 0;
    
    // Si no hay puntos de ruta, salir
    if (!routeAnimationPath || routeAnimationPath.length < 2) {
        console.error("No hay ruta para animar");
        return;
    }
    
    // Crear icono según el tipo de vehículo seleccionado
    const vehicleIcon = getVehicleIcon(selectedVehicleType);
    
    // Crear marcador personalizado para la animación
    const customIcon = L.divIcon({
        className: 'vehicle-marker-icon',
        html: `<div class="vehicle-icon">${vehicleIcon}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
    
    // Crear marcador en la primera coordenada de la ruta
    routeAnimationMarker = L.marker(routeAnimationPath[0], {
        icon: customIcon,
        zIndexOffset: 1000 // Para que aparezca por encima de otros marcadores
    }).addTo(map);
    
    // Ajustar mapa para ver bien el punto inicial
    map.setView(routeAnimationPath[0], Math.max(map.getZoom(), 14));
    
    // Cambiar el botón de animación
    updateAnimationButton(true);
    
    // Añadir controles de la animación
    addAnimationControls();
    
    // Iniciar la animación
    isAnimationPlaying = true;
    moveMarkerAlongRoute();
}

// Función para obtener el ícono adecuado según el tipo de vehículo
function getVehicleIcon(vehicleType) {
    switch(vehicleType) {
        case 'car':
            return '🚗';
        case 'bike':
            return '🚲';
        case 'foot':
            return '🚶';
        default:
            return '🚗';
    }
}

// Función para mover el marcador a lo largo de la ruta
function moveMarkerAlongRoute() {
    if (!isAnimationPlaying || !routeAnimationMarker) return;
    
    // Si llegamos al final de la ruta
    if (routeAnimationIndex >= routeAnimationPath.length - 1) {
        // Volver al inicio para repetir
        routeAnimationIndex = 0;
        
        // Opcional: detener la animación al completar
        // stopRouteAnimation();
        // return;
    }
    
    // Mover marcador a la siguiente posición
    routeAnimationMarker.setLatLng(routeAnimationPath[routeAnimationIndex]);
    
    // Centrar mapa en el marcador si está fuera de vista
    if (!map.getBounds().contains(routeAnimationPath[routeAnimationIndex])) {
        map.panTo(routeAnimationPath[routeAnimationIndex]);
    }
    
    // Incrementar índice para el siguiente movimiento
    routeAnimationIndex++;
    
    // Programar el siguiente movimiento
    routeAnimationTimer = setTimeout(moveMarkerAlongRoute, routeAnimationSpeed);
}

// Función para pausar/reanudar la animación
function toggleAnimation() {
    isAnimationPlaying = !isAnimationPlaying;
    
    updateAnimationButton(isAnimationPlaying);
    
    if (isAnimationPlaying) {
        moveMarkerAlongRoute();
    } else {
        clearTimeout(routeAnimationTimer);
    }
}

// Función para detener la animación
function stopRouteAnimation() {
    // Limpiar el temporizador
    if (routeAnimationTimer) {
        clearTimeout(routeAnimationTimer);
        routeAnimationTimer = null;
    }
    
    // Quitar el marcador
    if (routeAnimationMarker) {
        map.removeLayer(routeAnimationMarker);
        routeAnimationMarker = null;
    }
    
    // Quitar los controles
    removeAnimationControls();
    
    // Restablecer estados
    isAnimationPlaying = false;
    routeAnimationIndex = 0;
    
    // Actualizar botón
    updateAnimationButton(false);
}

// Función para añadir controles de animación
function addAnimationControls() {
    // Eliminar controles previos si existen
    removeAnimationControls();
    
    // Crear contenedor de controles
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'animation-controls';
    controlsContainer.className = 'animation-controls';
    
    // Botón de parar
    const stopButton = document.createElement('button');
    stopButton.innerHTML = '⏹️';
    stopButton.title = 'Detener animación';
    stopButton.addEventListener('click', stopRouteAnimation);
    
    // Botón de pausar/reanudar
    const pauseButton = document.createElement('button');
    pauseButton.innerHTML = '⏸️';
    pauseButton.title = 'Pausar animación';
    pauseButton.addEventListener('click', toggleAnimation);
    
    // Controles de velocidad
    const speedContainer = document.createElement('div');
    speedContainer.className = 'animation-speed';
    
    const speedDownButton = document.createElement('button');
    speedDownButton.innerHTML = '🐢';
    speedDownButton.title = 'Más lento';
    speedDownButton.addEventListener('click', () => {
        routeAnimationSpeed = Math.min(routeAnimationSpeed * 1.5, 500);
    });
    
    const speedUpButton = document.createElement('button');
    speedUpButton.innerHTML = '🐇';
    speedUpButton.title = 'Más rápido';
    speedUpButton.addEventListener('click', () => {
        routeAnimationSpeed = Math.max(routeAnimationSpeed * 0.7, 10);
    });
    
    // Ensamblar controles
    speedContainer.appendChild(speedDownButton);
    speedContainer.appendChild(speedUpButton);
    
    controlsContainer.appendChild(stopButton);
    controlsContainer.appendChild(pauseButton);
    controlsContainer.appendChild(speedContainer);
    
    // Añadir al mapa
    document.querySelector('.map-container').appendChild(controlsContainer);
}

// Función para eliminar controles de animación
function removeAnimationControls() {
    const existingControls = document.getElementById('animation-controls');
    if (existingControls) {
        existingControls.remove();
    }
}

// Función para actualizar el botón de animación
function updateAnimationButton(isPlaying) {
    const animationButton = document.getElementById('route-animation-button');
    if (!animationButton) return;
    
    if (isPlaying) {
        animationButton.innerHTML = '<span>⏸️ Pausar simulación</span>';
    } else if (routeAnimationMarker) {
        animationButton.innerHTML = '<span>▶️ Continuar simulación</span>';
    } else {
        animationButton.innerHTML = '<span>▶️ Simular recorrido</span>';
    }
}

