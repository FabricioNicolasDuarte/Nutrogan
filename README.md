🐮 NUTROGAN: Gestión Ganadera Inteligente (Offline-First)!(https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)!(https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)!(https://img.shields.io/badge/Status-MVP%20Finalizado-success?style=for-the-badge)Trabajo Final Integrador (TFI)Tecnicatura Universitaria en Programación - UTN FRR (Extensión Áulica Formosa)Comisión: 2.2 | Año: 2025📋 Ficha del ProyectoRolEstudianteLegajoResponsabilidades PrincipalesTech Lead / FrontendDuarte, Fabricio Nicolás29.154Arquitectura PWA, UX/UI, Lógica Offline.Backend / DataAscona, Enzo Ariel29.134Base de Datos, Seguridad (RLS), Pinia Stores.DevOps / QAAmarilla, Sebastián Emanuel29.132Docker, CI/CD Pipelines, Testing Automatizado.Docentes: Facundo Verón / Eduardo RoigAsignatura: Metodología de Sistemas II📖 Descripción del ProductoNUTROGAN es una plataforma Progressive Web App (PWA) diseñada para solucionar la problemática de la "gestión a ciegas" en la ganadería del NEA. Debido a la baja conectividad en zonas rurales, los sistemas en la nube tradicionales fallan.Nutrogan implementa una arquitectura Offline-First: permite al productor registrar pesos, movimientos de lotes y estados de recursos hídricos sin conexión a internet. Los datos se persisten localmente (IndexedDB) y se sincronizan automáticamente con la nube (Supabase) cuando se recupera la conectividad.Funcionalidades Clave📱 100% Offline: Funciona en potreros sin señal 4G.📊 Cálculo de GDPV: Métricas automáticas de Ganancia Diaria de Peso Vivo.🗺️ GIS Integrado: Mapas satelitales interactivos de potreros.💧 Monitor de Recursos: Alertas de estado de aguadas y stock de insumos.🔐 Seguridad: Roles diferenciados (Admin, Veterinario, Peón).🛠 Stack TecnológicoLa solución se construye sobre un stack moderno y escalable:Frontend: Vue.js 3 (Composition API) + Quasar Framework (Vite).Estado & Persistencia: Pinia + pinia-plugin-persistedstate (IndexedDB Wrapper).Backend as a Service (BaaS): Supabase (PostgreSQL 15, Auth, Storage).Mapas: Leaflet.js (OpenStreetMap/Esri Satellite).Calidad (QA): Vitest (Unit Testing) + Cypress (E2E Testing).Infraestructura: Docker (Multi-stage builds) + GitLab CI/CD.🔄 Metodología y Flujo de Trabajo (GitFlow)Para garantizar la estabilidad del código en un equipo distribuido, implementamos estrictamente el flujo de trabajo GitFlow.Estructura de Ramasmain: Código de producción. Intocable directamente.develop: Rama de integración. Aquí convergen las features terminadas.feature/_: Ramas temporales para cada nueva funcionalidad.hotfix/_: Parches urgentes para producción.Diagrama del FlujoFragmento de código%% Si GitLab no renderiza mermaid, ver diagrama ASCII abajo
gitGraph
commit
branch develop
checkout develop
commit
branch feature/agua
checkout feature/agua
commit id: "feat: UI"
commit id: "logic: store"
checkout develop
merge feature/agua
branch release/1.0
checkout release/1.0
commit id: "bump version"
checkout main
merge release/1.0 tag: "v1.0"
checkout develop
merge release/1.0
Ejemplo Real de Aplicación: "Alertas de Agua"Inicio: Se crea la rama feature/smart-water-alert desde develop.Desarrollo: Se codifica el componente SmartWaterCard.vue y la lógica en data-store.js.Pull Request (MR): Se abre un Merge Request hacia develop. El CI ejecuta tests automáticos.Merge: Tras la aprobación (Code Review), se fusiona a develop. La rama feature se elimina.📐 Arquitectura y Principios SOLIDEl código fuente ha sido auditado para cumplir con principios de diseño robustos, evitando "code smells".1. Single Responsibility Principle (SRP)Separamos estrictamente la Presentación (UI) de la Lógica de Negocio.Violación (Mal): Un componente .vue que calcula promedios y llama a la API directamente.En Nutrogan (Bien):SmartWaterCard.vue: Solo se encarga de mostrar el color rojo si el estado es "Peligro".useDataStore.js: Contiene la lógica matemática para decidir qué es "Peligro" y la conexión a la BD.2. Open/Closed Principle (OCP)Componentes abiertos a la extensión, cerrados a la modificación.Ejemplo: Los componentes base (ej. BaseCard.vue) utilizan Slots de Vue. Esto permite inyectar contenido nuevo (botones, gráficos) sin tocar el código fuente del componente original, evitando regresiones.3. Dependency Inversion Principle (DIP)Los componentes de alto nivel no dependen de implementaciones de bajo nivel (como la librería supabase-js), sino de abstracciones (Stores).Beneficio: Esto nos permite realizar Mocking en los tests. En SmartWaterCard.test.js, inyectamos un Store falso para probar la UI sin necesitar una base de datos real.🗃 Diccionario de Datos (Modelo Relacional)El backend utiliza PostgreSQL. A continuación se describen las entidades críticas del negocio.Tabla: lotesAgrupación lógica de animales para manejo colectivo.CampoTipoRestricciónDescripciónidUUIDPKIdentificador único del lote.establecimiento_idUUIDFKVinculación con el campo/finca (Multi-tenant).nombreVARCHARNOT NULLEtiqueta legible (ej. "Terneros 2025").cantidad_animalesINTCheck > 0Cantidad actual de cabezas.gdpv_promedioDECIMAL-Campo computado (cache) de ganancia diaria.Tabla: recursos_aguaPuntos de monitoreo hídrico.CampoTipoRestricciónDescripciónidUUIDPKIdentificador de la aguada.tipoENUM-'Tanque', 'Represa', 'Bebedero'.capacidad_litrosINT-Capacidad máxima de almacenamiento.ultimo_estadoVARCHAR-'Optimo', 'Precaución', 'Peligro'.fecha_medicionTIMESTAMPTZ-Fecha de la última toma de muestra.🚀 Instalación y DespliegueRequisitos PreviosNode.js v18+Docker & Docker Compose (Opcional, para prod)Cuenta en Supabase (o usar mocks locales)1. Desarrollo LocalBash# Clonar el repositorio
git clone https://gitlab.com/tu-usuario/nutrogan.git
cd nutrogan

# Instalar dependencias

npm install

# Configurar variables de entorno

cp.env.example.env

# Editar.env con tus keys de Supabase (URL y ANON_KEY)

# Iniciar servidor de desarrollo (Hot Reload)

quasar dev 2. Ejecución con Docker (Producción)Simula el entorno de producción servido por Nginx.Bash# Construir y levantar contenedores
docker-compose up --build -d

# Acceder a la app

# La aplicación estará disponible en http://localhost:8080

✅ Testing y CalidadEjecutamos una pirámide de pruebas completa antes de cada integración.Unit Testing (Vitest)Prueba la lógica de negocio (cálculos financieros, validaciones) y componentes aislados.Bash# Ejecutar tests unitarios
npm run test:unit

# Ver reporte de cobertura

npm run test:coverage
E2E Testing (Cypress)Simula un usuario real navegando por la aplicación (Login, Carga de datos).Bash# Abrir interfaz de Cypress
npm run test:e2e
📄 LicenciaEste proyecto es de carácter académico para la Universidad Tecnológica Nacional.Distribuido bajo la licencia MIT.Generado automáticamente para la entrega final del TFI - 25/11/2025
