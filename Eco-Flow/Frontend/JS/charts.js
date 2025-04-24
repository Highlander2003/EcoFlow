// Variables para almacenar referencias a los gráficos
let emissionsChart = null;
let transportEmissionsChart = null;
let trafficChart = null;
let monthlySavingsChart = null;

// Inicializa los gráficos cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar gráfico de emisiones en la página principal
    if (document.getElementById('emissionsChart')) {
        initEmissionsChart();
    }
    
    // Inicializar gráficos del dashboard
    if (document.getElementById('transportEmissionsChart')) {
        initDashboardCharts();
    }
});

// Inicializa el gráfico de emisiones de la ruta actual
function initEmissionsChart() {
    const ctx = document.getElementById('emissionsChart').getContext('2d');
    
    emissionsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Auto', 'Bicicleta', 'A pie'],
            datasets: [{
                label: 'Emisiones CO2 (kg)',
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(54, 162, 235, 0.7)'
                ],
                borderColor: [
                    'rgb(255, 99, 132)',
                    'rgb(75, 192, 192)',
                    'rgb(54, 162, 235)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Emisiones de CO2 (kg)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Comparativa de emisiones por tipo de transporte'
                }
            }
        }
    });
}

// Actualiza los datos del gráfico de emisiones
function updateEmissionsChartData(emissions, vehicleType) {
    if (!emissionsChart) return;
    
    // Calcular emisiones para diferentes modos de transporte
    // basados en la emisión actual
    const distance = emissions / 0.12; // Extraer distancia aproximada
    
    const emissionsByCar = distance * 0.12;
    const emissionsByBike = 0;
    const emissionsByWalk = 0;
    
    emissionsChart.data.datasets[0].data = [
        emissionsByCar.toFixed(2),
        emissionsByBike.toFixed(2),
        emissionsByWalk.toFixed(2)
    ];
    
    // Resaltar el modo actualmente seleccionado
    const alphas = ['rgba(255, 99, 132, 0.4)', 'rgba(75, 192, 192, 0.4)', 'rgba(54, 162, 235, 0.4)'];
    const selectedIndex = vehicleType === 'car' ? 0 : (vehicleType === 'bike' ? 1 : 2);
    
    for (let i = 0; i < 3; i++) {
        if (i === selectedIndex) {
            emissionsChart.data.datasets[0].backgroundColor[i] = alphas[i].replace('0.4', '0.9');
        } else {
            emissionsChart.data.datasets[0].backgroundColor[i] = alphas[i];
        }
    }
    
    emissionsChart.update();
}

// Inicializa los gráficos del dashboard
function initDashboardCharts() {
    initTransportEmissionsChart();
    initTrafficChart();
    initMonthlySavingsChart();
}

// Inicializa el gráfico de emisiones por tipo de transporte
function initTransportEmissionsChart() {
    const ctx = document.getElementById('transportEmissionsChart').getContext('2d');
    
    transportEmissionsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Auto particular', 'Transporte público', 'Bicicleta', 'A pie'],
            datasets: [{
                data: [65, 25, 5, 5],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(255, 205, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(54, 162, 235, 0.7)'
                ],
                borderColor: [
                    'rgb(255, 99, 132)',
                    'rgb(255, 205, 86)',
                    'rgb(75, 192, 192)',
                    'rgb(54, 162, 235)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: 'Distribución de emisiones por tipo de transporte'
                }
            }
        }
    });
}

// Inicializa el gráfico de tráfico en tiempo real
function initTrafficChart() {
    const ctx = document.getElementById('trafficChart').getContext('2d');
    
    // Datos simulados de tráfico por hora
    const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
    const trafficData = [
        10, 5, 3, 2, 5, 15, 35, 65, 75, 60, 
        50, 55, 65, 60, 65, 70, 85, 90, 65, 
        50, 40, 30, 20, 15
    ];
    
    trafficChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [{
                label: 'Nivel de congestión',
                data: trafficData,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Congestión (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Hora del día'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Tráfico durante el día'
                }
            }
        }
    });
}

// Inicializa el gráfico de ahorro mensual de emisiones
function initMonthlySavingsChart() {
    const ctx = document.getElementById('monthlySavingsChart').getContext('2d');
    
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const savingsData = [120, 150, 180, 210, 250, 300];
    
    monthlySavingsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Emisiones ahorradas (kg CO2)',
                data: savingsData,
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Emisiones ahorradas (kg CO2)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Ahorro mensual de emisiones'
                }
            }
        }
    });
}