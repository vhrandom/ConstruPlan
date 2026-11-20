This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Proyectos

La página de inicio muestra los proyectos disponibles y permite crear o eliminar proyectos. Cada proyecto abre su propio cronograma en `/projects/[id]`; sus actividades, dependencias y reportes se mantienen aislados de los demás proyectos. En el cronograma, **Ctrl+Z** o el botón **Deshacer** revierte hasta 50 cambios recientes de actividades. Las exportaciones PDF y Excel muestran una carta Gantt con calendario diario, duración, estado y predecesoras. Al iniciar una base de datos existente, las actividades sin proyecto se asignan a **Proyecto inicial** para conservar el cronograma anterior.

Eliminar un proyecto requiere confirmación y borra permanentemente el proyecto y todas sus actividades.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
