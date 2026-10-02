# SPP · Software de Prácticas Pedagógicas (MVC + DAO)

Node.js + Express (POO) · Supabase Auth · PostgreSQL (Neon) · MongoDB Atlas · Cloudinary

## Estructura (patrón MVC)

```
controlador/   Controladores (clases) + rutas + middleware de autenticación/roles
main/          Arranque: index.js, Servidor.js y scripts (esquema, primer director)
modelado/      Modelo
  config/        Conexiones (Postgres, Mongo, Cloudinary, Supabase) y variables de entorno
  dao/           DAO: toda consulta SQL/Mongo vive aquí y solo aquí
  mongo/         Schemas de Mongoose (Auditoria, IndicadorAcreditacion, Notificacion) – del zip "Conexiones"
  sql/           Esquemas PostgreSQL propuestos
  pruebas/       Pruebas automáticas (opcionales)
vistas/        HTML, CSS, JavaScript e img del SOFTWARE original
```

Flujo: **Vista (JS) → /api (Rutas) → Controlador → DAO → BD**. Las vistas nunca tocan la BD.

## Puesta en marcha

1. `npm install`
2. Copia `.env.example` a `.env` y complétalo (NO subas `.env` a git).
3. En Supabase (Authentication → Providers → Email) deja habilitado Email/Password. La *service role key* solo va en `.env`.
4. `npm run esquema` crea las tablas en las dos bases de PostgreSQL (ver nota abajo).
5. `npm run crear-director` crea el primer Director (usa las variables `DIRECTOR_*`).
6. `npm start` y abre http://localhost:3000

El usuario escribe en el login solo la parte antes de la `@` (se agrega `DOMINIO_INSTITUCIONAL`) o su correo completo.

## Autenticación y seguridad

- Supabase valida usuario/contraseña. El **rol y estado** se leen de PostgreSQL (el director crea cada cuenta en Supabase + su perfil en la tabla del rol).
- El token viaja en cookie `httpOnly` + `SameSite=Lax` (+ `Secure` en producción); el JS del navegador no puede leerlo.
- Cada panel HTML solo se entrega a su rol. Cada endpoint verifica rol y **pertenencia** (un estudiante solo ve su práctica; tutor/asesor solo las asignadas).
- CSRF: toda petición que modifica datos exige la cabecera `X-SPP: 1`. Rate-limit en login. Helmet + CSP. Consultas parametrizadas.
- Subida de evidencias: máx. 10 MB y tipos permitidos (PDF, imágenes, Office, texto).

## Importante

- **El esquema de PostgreSQL es propuesto**: los zip traían los nombres de tablas (en `env`) pero no sus columnas, salvo `evidenciaactividad`. Si tus tablas ya existen, ajusta solo los DAO de `modelado/dao/`.
- Las pantallas de **Informes → pestañas Tipos/Bitácoras/Retro/Instituciones** conservan sus gráficas de ejemplo; arriba se agregó el bloque *Indicadores de acreditación* con datos reales (se calculan desde PostgreSQL y se guardan en Mongo `indicadoresacreditacion`).
- El envío real de correos de `Notificacion` lo haría tu microservicio; aquí solo se registran en Mongo (`PracticaAsignada`).
- Las contraseñas no se pueden mostrar (Supabase guarda solo el hash): al editar un usuario, dejar la clave vacía la conserva.
- `npm run prueba` necesita un PostgreSQL local (`spp_est` y `spp_eva`, usuario/clave `spp`) con `DB_SSL=false`; **borra el contenido** de esas bases.
- Rota las credenciales que venían en `Conexiones/env` si ese archivo se compartió fuera de tu equipo.
