// ✅ CORRECCIÓN: apiUrl debe apuntar al servidor de producción (Render, Railway, etc.)
// Cambia esta URL por la URL real de tu backend desplegado.
// NUNCA uses 127.0.0.1 en producción — esa dirección es localhost del usuario,
// no del servidor.
export const environment = {
  production: true,
  apiUrl: 'https://TU-BACKEND.onrender.com',   // ← CAMBIAR por tu URL real de Render
  googleMapsKey: 'AIzaSyB7Joq65fsI77lCf7oE1zWoHTiam8FCuEs'
};