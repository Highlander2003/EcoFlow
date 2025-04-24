// URL base de la API
const API_BASE_URL = 'http://localhost:5000/api';

// Función para buscar lugares usando la API
async function searchPlaces(query) {
    try {
        const response = await fetch(`${API_BASE_URL}/routes/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Error en la búsqueda');
        }
        const data = await response.json();
        return data.places || [];
    } catch (error) {
        console.error('Error al buscar lugares:', error);
        return [];
    }
}

// Función para calcular ruta entre dos puntos
async function calculateRoute(origin, destination, vehicleType = 'car') {
    try {
        const response = await fetch(`${API_BASE_URL}/routes/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                origin,
                destination,
                vehicle_type: vehicleType
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al calcular la ruta');
        }
        
        const data = await response.json();
        return data.route;
    } catch (error) {
        console.error('Error al calcular la ruta:', error);
        // Retornar datos simulados para pruebas si la API falla
        return {
            distance: 5.2,
            duration: 12,
            emissions: vehicleType === 'car' ? 0.62 : 0,
            path: [
                { lat: origin.lat, lon: origin.lon },
                { lat: destination.lat, lon: destination.lon }
            ]
        };
    }
}

// Función para optimizar rutas con múltiples paradas
async function optimizeRoute(waypoints, vehicleType = 'car') {
    try {
        const response = await fetch(`${API_BASE_URL}/routes/optimize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                waypoints,
                vehicle_type: vehicleType,
                optimization_criteria: 'distance'
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al optimizar la ruta');
        }
        
        const data = await response.json();
        return data.route;
    } catch (error) {
        console.error('Error al optimizar la ruta:', error);
        
        // Datos simulados para pruebas si la API falla
        const totalDistance = waypoints.length * 3;
        const optimizedPath = waypoints.map(wp => ({ lat: wp.lat, lon: wp.lon }));
        
        return {
            total_distance: totalDistance,
            estimated_time: totalDistance * 2,
            emissions: vehicleType === 'car' ? totalDistance * 0.12 : 0,
            path: optimizedPath
        };
    }
}

// Función para obtener datos históricos de sensores
async function getSensorHistory(sensorId, startDate, endDate) {
    try {
        let url = `${API_BASE_URL}/sensors/history/${sensorId}`;
        
        if (startDate || endDate) {
            url += '?';
            if (startDate) url += `start_date=${startDate}`;
            if (startDate && endDate) url += '&';
            if (endDate) url += `end_date=${endDate}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Error al obtener datos del sensor');
        }
        
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error al obtener datos del sensor:', error);
        return [];
    }
}