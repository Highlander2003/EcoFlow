# EcoFlow - Optimización de Rutas de Transporte Público 🚌

## Descripción
EcoFlow es una plataforma web que implementa algoritmos inteligentes para optimizar rutas de transporte público, con el objetivo de reducir emisiones de CO₂ y mejorar la eficiencia del sistema de transporte en Cali, Colombia.

## Características Principales
- 🗺️ Optimización de rutas en tiempo real
- 📊 Dashboard interactivo con métricas ambientales
- 🔗 Integración con APIs de mapas y clima
- 📱 Monitoreo IoT de condiciones de tráfico
- 📈 Análisis predictivo de flujos de pasajeros

## Tecnologías Utilizadas
- **Frontend:** React.js, TailwindCSS, Leaflet.js, Chart.js
- **Backend:** Python (Flask), NetworkX, DEAP
- **Base de Datos:** PostgreSQL, Firebase
- **DevOps:** Docker, GitHub Actions
- **APIs:** Google Maps, TomTom Traffic, OpenWeatherMap

## Requisitos
- Node.js >= 16.x
- Python >= 3.8
- PostgreSQL >= 13
- Docker

## Instalación
```bash
# Clonar el repositorio
git clone https://github.com/your-username/ecoflow.git

# Instalar dependencias del frontend
cd frontend
npm install

# Instalar dependencias del backend
cd ../backend
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
```

## Configuración
1. Crear archivo `.env` con las credenciales necesarias
2. Configurar conexión a base de datos
3. Obtener API keys para servicios externos

## Uso
```bash
# Iniciar frontend
cd frontend
npm run dev

# Iniciar backend
cd backend
python app.py
```

## Contribución
1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: nueva característica'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia
Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para detalles

## Contacto
Luis Fernando Caicedo - [@username](https://twitter.com/username)

## Agradecimientos
- Institución Univeristaria Antonio José Camacho
- Secretaría de Movilidad de Cali
- Sistema MIO
- Equipo de desarrollo
