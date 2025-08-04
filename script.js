// script.js


const OPENWEATHER_API_KEY = 'dfa2db4a26fd81e081efc296958e4c5d';


let currentLat = 27.4924;
let currentLon = 77.6737;
let currentCityName = 'Mathura';

// DOM Elements
const forecastHeaderElement = document.getElementById('forecastHeader');
const citySearchInput = document.getElementById('citySearchInput');
const searchButton = document.getElementById('searchButton');
const currentMapLocation = document.getElementById('currentMapLocation');
const sunriseTimeElement = document.getElementById('sunriseTime');
const sunsetTimeElement = document.getElementById('sunsetTime');
const currentAqiElement = document.getElementById('currentAqi');
const currentUviElement = document.getElementById('currentUvi');
const currentTempElement = document.getElementById('currentTemp');
const currentWindElement = document.getElementById('currentWind');
const currentHumidityElement = document.getElementById('currentHumidity');
const currentPressureElement = document.getElementById('currentPressure');
const weatherDescriptionElement = document.getElementById('weatherDescription');
const windChartCanvas = document.getElementById('windChart');
const humidityChartCanvas = document.getElementById('humidityChart');

let weatherMap;
let mapMarker;
let windChartInstance;
let humidityChartInstance;


function initializeMap() {
    if (weatherMap) {
        weatherMap.remove();
    }
    weatherMap = L.map('weatherMap').setView([currentLat, currentLon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(weatherMap);

    mapMarker = L.marker([currentLat, currentLon]).addTo(weatherMap)
        .bindPopup(`<b>${currentCityName}</b><br>Current Weather Data`)
        .openPopup();

    currentMapLocation.textContent = `Location: ${currentCityName} (Lat: ${currentLat.toFixed(2)}, Lon: ${currentLon.toFixed(2)})`;
}

async function getCoordinatesForCity(cityName) {
    try {
        const geoApiUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${OPENWEATHER_API_KEY}`;
        const response = await fetch(geoApiUrl);
        if (!response.ok) {
            throw new Error(`Geocoding error: ${response.statusText}`);
        }
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: data[0].lat,
                lon: data[0].lon,
                name: data[0].name,
                state: data[0].state || '',
                country: data[0].country
            };
        } else {
            alert('City not found. Please try again.');
            return null;
        }
    } catch (error) {
        console.error("Error fetching city coordinates:", error);
        alert('Could not get city coordinates. Please check your input.');
        return null;
    }
}

async function fetchAllWeatherData(lat, lon) {
    try {
        const forecastApiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const currentWeatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const aqiApiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`;
        const uviApiUrl = `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`;

        const [forecastResponse, currentResponse, aqiResponse, uviResponse] = await Promise.all([
            fetch(forecastApiUrl),
            fetch(currentWeatherApiUrl),
            fetch(aqiApiUrl),
            fetch(uviApiUrl)
        ]);

        if (!forecastResponse.ok || !currentResponse.ok || !aqiResponse.ok || !uviResponse.ok) {
            throw new Error('Failed to fetch some weather data.');
        }

        const forecastData = await forecastResponse.json();
        const currentData = await currentResponse.json();
        const aqiData = await aqiResponse.json();
        const uviData = await uviResponse.json();

        console.log("Fetched All Data:", { forecast: forecastData, current: currentData, aqi: aqiData, uvi: uviData });

        return { forecast: forecastData, current: currentData, aqi: aqiData, uvi: uviData };

    } catch (error) {
        console.error("Error fetching weather data:", error);
        alert(`Error fetching weather data: ${error.message}. Please check your API key and try again later.`);

        // Reset all UI elements on error
        currentTempElement.textContent = 'N/A';
        currentWindElement.textContent = 'N/A';
        currentHumidityElement.textContent = 'N/A';
        currentPressureElement.textContent = 'N/A';
        weatherDescriptionElement.textContent = 'N/A';
        currentAqiElement.textContent = 'N/A';
        currentUviElement.textContent = 'N/A';
        sunriseTimeElement.textContent = 'N/A';
        sunsetTimeElement.textContent = 'N/A';
        forecastHeaderElement.innerHTML = '';

        if (windChartInstance) windChartInstance.destroy();
        if (humidityChartInstance) humidityChartInstance.destroy();
        return null;
    }
}


function updateUI(weatherData) {
    if (!weatherData) return;

    const { forecast, current, aqi, uvi } = weatherData;

    // --- Dynamic background code ---
    if (current && current.weather && current.weather.length > 0) {
        const weatherIconCode = current.weather[0].icon;

        let backgroundClass = 'default-bg';

        if (weatherIconCode.includes('01')) {
            backgroundClass = 'clear-sky-bg';
        } else if (weatherIconCode.includes('02') || weatherIconCode.includes('03') || weatherIconCode.includes('04')) {
            backgroundClass = 'clouds-bg';
        } else if (weatherIconCode.includes('09') || weatherIconCode.includes('10')) {
            backgroundClass = 'rain-bg';
        } else if (weatherIconCode.includes('11')) {
            backgroundClass = 'thunderstorm-bg';
        } else if (weatherIconCode.includes('13')) {
            backgroundClass = 'snow-bg';
        } else if (weatherIconCode.includes('50')) {
            backgroundClass = 'mist-bg';
        }

        document.body.className = backgroundClass;
    } else {
        document.body.className = 'default-bg';
    }

    // --- Update all current weather stats ---
    currentTempElement.textContent = current.main ? `${current.main.temp.toFixed(1)}°C` : 'N/A';
    currentWindElement.textContent = current.wind ? `${current.wind.speed.toFixed(1)} m/s` : 'N/A';
    currentHumidityElement.textContent = current.main ? `${current.main.humidity}%` : 'N/A';
    currentPressureElement.textContent = current.main ? `${current.main.pressure} hPa` : 'N/A';
    weatherDescriptionElement.textContent = current.weather && current.weather.length > 0 ? current.weather[0].description : 'N/A';

    // --- Update AQI and UV Index ---
    const aqiComponent = aqi.list && aqi.list.length > 0 ? aqi.list[0].main.aqi : 'N/A';
    const uviValue = uvi.value !== undefined ? uvi.value.toFixed(1) : 'N/A';
    currentAqiElement.textContent = aqiComponent;
    currentUviElement.textContent = uviValue;

    // --- Update Sunrise and Sunset ---
    if (current.sys && current.sys.sunrise && current.sys.sunset) {
        const sunriseDate = new Date(current.sys.sunrise * 1000);
        const sunsetDate = new Date(current.sys.sunset * 1000);
        const sunriseTime = sunriseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        const sunsetTime = sunsetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        sunriseTimeElement.textContent = sunriseTime;
        sunsetTimeElement.textContent = sunsetTime;
    } else {
        sunriseTimeElement.textContent = 'N/A';
        sunsetTimeElement.textContent = 'N/A';
    }

    // --- Update forecast header with icons and temp ---
    const labels = [];
    const windSpeeds = [];
    const humidities = [];

    forecastHeaderElement.innerHTML = '';
    const forecastItemsContainer = document.createElement('div');
    forecastItemsContainer.className = 'forecast-items-container';

    forecast.list.slice(0, 8).forEach(item => {
        const date = new Date(item.dt * 1000);
        labels.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        windSpeeds.push(item.wind.speed.toFixed(1));
        humidities.push(item.main.humidity.toFixed(0));

        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';

        const time = document.createElement('p');
        time.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const icon = document.createElement('img');
        icon.src = `http://openweathermap.org/img/wn/${item.weather[0].icon}.png`;
        icon.alt = item.weather[0].description;

        const temp = document.createElement('p');
        temp.textContent = `${item.main.temp.toFixed(0)}°C`;

        forecastItem.appendChild(time);
        forecastItem.appendChild(icon);
        forecastItem.appendChild(temp);

        forecastItemsContainer.appendChild(forecastItem);
    });

    forecastHeaderElement.appendChild(forecastItemsContainer);

    // --- Plot charts ---
    plotCharts(labels, windSpeeds, humidities);
}

function plotCharts(labels, windData, humidityData) {
    if (windChartInstance) windChartInstance.destroy();
    if (humidityChartInstance) humidityChartInstance.destroy();

    windChartInstance = new Chart(windChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Wind Speed (m/s)',
                data: windData,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Wind Speed Forecast (Next 24 Hrs)' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Speed (m/s)' }
                },
                x: {
                    title: { display: true, text: 'Time' }
                }
            }
        }
    });

    humidityChartInstance = new Chart(humidityChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Humidity (%)',
                data: humidityData,
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.2)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Humidity Forecast (Next 24 Hrs)' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Humidity (%)' }
                },
                x: {
                    title: { display: true, text: 'Time' }
                }
            }
        }
    });
}


async function initializeDashboard() {
    // Set a default background on initial load
    document.body.className = 'default-bg';
    initializeMap();
    const weatherData = await fetchAllWeatherData(currentLat, currentLon);
    if (weatherData) {
        updateUI(weatherData);
    }
}


searchButton.addEventListener('click', async () => {
    const cityName = citySearchInput.value.trim();
    if (cityName) {
        const geoData = await getCoordinatesForCity(cityName);
        if (geoData) {
            currentLat = geoData.lat;
            currentLon = geoData.lon;
            currentCityName = geoData.name;

            weatherMap.setView([currentLat, currentLon], 10);
            mapMarker.setLatLng([currentLat, currentLon])
                     .bindPopup(`<b>${currentCityName}</b><br>Current Weather Data`)
                     .openPopup();
            currentMapLocation.textContent = `Location: ${currentCityName} (Lat: ${currentLat.toFixed(2)}, Lon: ${currentLon.toFixed(2)})`;

            const weatherData = await fetchAllWeatherData(currentLat, currentLon);
            if (weatherData) {
                updateUI(weatherData);
            }
        }
    } else {
        alert('Please enter a city name.');
    }
});


citySearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchButton.click();
    }
});


initializeDashboard();
