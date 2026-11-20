# ConstruPlan

ConstruPlan es una aplicación web para planificar obras y gestionar actividades en una carta Gantt interactiva. Permite organizar varios proyectos y mantener sus cronogramas separados.

## Funcionalidades

- Crear, renombrar y eliminar proyectos. Al eliminar un proyecto, también se eliminan sus actividades.
- Crear y editar actividades, responsables, fechas, duración, estado y tipo (tarea o hito).
- Mover actividades y cambiar su duración arrastrándolas en la carta Gantt.
- Crear dependencias entre actividades y ver su efecto en el cronograma.
- Filtrar actividades por estado y cambiar la escala visual de los días.
- Deshacer hasta 50 cambios recientes del cronograma con **Ctrl+Z** o el botón **Deshacer**. El historial es temporal y se pierde al recargar la página.
- Exportar cada proyecto a Excel y PDF con formato de carta Gantt.

## Tecnologías

- Next.js 15, React 19 y TypeScript
- SQLite con `better-sqlite3`
- Tailwind CSS
- ExcelJS y `pdf-lib` para los reportes
- pnpm

La aplicación se encuentra en [`web/`](./web).

## Requisitos

- Node.js 20 o superior
- pnpm

## Instalación y desarrollo

Desde la raíz del repositorio:

```bash
cd web
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

Para validar el proyecto:

```bash
cd web
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

`better-sqlite3` es una dependencia nativa. Si pnpm solicita aprobación de scripts de dependencias, autoriza las dependencias nativas requeridas antes de compilar o iniciar la aplicación.

## Base de datos local

SQLite crea y migra la base `web/construplan.db` al iniciar la aplicación. La base, sus diarios de transacciones y otras copias locales están excluidos de Git. En una instalación nueva se crea un proyecto inicial; al abrir una base antigua, las actividades sin proyecto se asignan al proyecto inicial.

No agregues bases de datos reales, credenciales ni archivos `.env` al repositorio. Si necesitas documentar variables de entorno, usa nombres de ejemplo sin valores secretos en `.env.example`.

## Estructura principal

```text
web/
├── src/
│   ├── app/          # Páginas y rutas API
│   ├── components/   # Carta Gantt, editor y lista de actividades
│   └── lib/          # Base de datos e historial de deshacer
├── public/           # Recursos estáticos
└── package.json
```

## Exportaciones

Desde el panel de actividades de cada proyecto se pueden descargar:

- **Excel:** carta Gantt y hoja de detalle de actividades.
- **PDF:** carta Gantt paginada para impresión.

Los reportes incluyen actividades y dependencias del proyecto seleccionado.
