# MatchLab — paquete PWA

## Qué incluye
- `index.html`: interfaz blanca compacta de MatchLab y constructor de cuotas.
- `manifest.webmanifest`: metadatos para instalación como aplicación web.
- `sw.js`: caché de la estructura de la aplicación para apertura posterior sin conexión.
- `icons/`: iconos vectoriales de la aplicación.
- `server.js`: servidor local opcional que sirve la app y ofrece una base de proxy API para los tres deportes.
- `.env.example`: nombres de variables de entorno para las claves privadas.

## Estado honesto de los datos
La interfaz actual sigue siendo un prototipo: los marcadores, jugadores, cuotas y probabilidades precargados son demostrativos. La instalación PWA no convierte esos ejemplos en datos reales. Las consultas de partidos, estadísticas individuales, lesiones, alineaciones, cuotas e historial deben implementarse por endpoint y validar la cobertura de liga/temporada de cada proveedor.

## Abrir para probar la interfaz
Se requiere servir la app por HTTP; abrir `index.html` directamente como `file://` no habilita Service Worker ni la instalación PWA.

Con Node.js 18 o superior:
1. Copia `.env.example` como `.env` y agrega las claves que hayas obtenido de los proveedores.
2. Ejecuta `node server.js`.
3. Abre `http://localhost:4173` en el navegador.
4. En Android, para instalar en el mismo dispositivo, la opción más fiable es publicar el paquete en un host HTTPS. `localhost` solo aplica al dispositivo que ejecuta el servidor.
5. En Chrome, abre el menú y elige **Instalar aplicación** o **Añadir a pantalla de inicio**.

No se necesita instalar paquetes npm: el servidor usa módulos nativos de Node.

## Proveedores sugeridos
- API-Football para fútbol: el plan gratuito publicado indica 100 solicitudes al día; la cobertura histórica y de competiciones depende del plan. Revisa su página oficial antes de depender de una liga.
- API-Basketball y API-Hockey son productos separados del mismo ecosistema API-Sports. Comprueba por separado las cuotas, ligas, endpoints y límites de sus planes gratuitos.
- Las cuotas de casas son un producto distinto a las estadísticas. La cobertura gratuita de proveedores de cuotas suele ser limitada y puede no incluir simultáneamente fútbol, baloncesto, hockey y props de jugadores.
- Para las claves privadas, usa variables de entorno en el servidor. No publiques una clave dentro del HTML ni en un repositorio.

## Proxy API local
`server.js` proporciona rutas de estado para comprobar conectividad de cada proveedor:
- `GET /api/status/football`
- `GET /api/status/basketball`
- `GET /api/status/hockey`

El proxy **no** afirma que una conexión válida signifique que todas las estadísticas estén disponibles. Todavía hay que implementar y mapear las rutas de fixtures, resultados, estadísticas por partido/jugador, H2H, lesiones, alineaciones y cuotas. Los endpoints y formatos difieren por deporte.

## Siguiente fase recomendada
1. Seleccionar ligas concretas para cada deporte.
2. Implementar adaptadores por proveedor con caché y control de límites.
3. Crear almacenamiento histórico normalizado por partido/jugador/temporada.
4. Construir probabilidades con validación retrospectiva y mostrar fuente, hora de actualización y tamaño de muestra.
5. Calcular valor esperado usando cuotas reales y retirar automáticamente cualquier selección cuyos datos estén vencidos o incompletos.
