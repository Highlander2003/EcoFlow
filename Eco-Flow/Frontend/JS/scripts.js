// Añadir al principio para depuración
console.log("Cargando scripts.js");

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
        // Centrar en una ubicación predeterminada en Bogotá
        const defaultLocation = [4.6097, -74.0817]; // Bogotá
        
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
            .bindPopup('Bogotá, Colombia')
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

// Función para añadir un waypoint a la ruta
function addWaypoint(place) {
    routeWaypoints.push(place);
    updateWaypointsList();
    
    // Añadir marcador al mapa
    if (map) {
        const marker = L.marker([place.lat, place.lon])
            .addTo(map)
            .bindPopup(place.name);
        
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
        waypointElement.innerHTML = `
            <span class="waypoint-number">${index + 1}</span>
            <span class="waypoint-name">${waypoint.name}</span>
            <button class="btn-remove-waypoint" data-index="${index}">🗑️</button>
        `;
        
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
                if (statsContainer) statsContainer.innerHTML = '';
            }
        });
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
    
    // Crear array de coordenadas para la ruta
    const routeCoordinates = route.path.map(point => [point.lat, point.lon]);
    
    // Crear línea de ruta
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

