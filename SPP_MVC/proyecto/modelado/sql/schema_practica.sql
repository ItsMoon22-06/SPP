-- =====================================================================
-- BASE "Estudiante/Práctica"  (DATABASE_URL_ESTUDIANTE)
-- OJO: el esquema real no venía en los .zip; este es un esquema PROPUESTO a partir
-- de los nombres de tablas del archivo env y de evidenciasRoutes.js. Ajústalo si tu
-- base ya existe (los DAO en modelo/dao son el único lugar donde viven estas consultas).
-- =====================================================================

CREATE TABLE IF NOT EXISTS programa (
  idprograma SERIAL PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL UNIQUE
);

-- Una tabla por rol (igual que el env: Estudiante, tutorAcademico, asesorPedagogico) + director
CREATE TABLE IF NOT EXISTS estudiante (
  numdocumento  VARCHAR(20) PRIMARY KEY,
  tipodocumento VARCHAR(5)  NOT NULL DEFAULT 'CC',
  nombres       VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(100) NOT NULL,
  correo        VARCHAR(150) NOT NULL UNIQUE,
  idprograma    INT REFERENCES programa(idprograma),
  estado        VARCHAR(10) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','pendiente','inactivo')),
  supabase_uid  UUID UNIQUE,
  ultimoacceso  TIMESTAMPTZ,
  creado        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tutoracademico (
  numdocumento  VARCHAR(20) PRIMARY KEY,
  tipodocumento VARCHAR(5)  NOT NULL DEFAULT 'CC',
  nombres       VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(100) NOT NULL,
  correo        VARCHAR(150) NOT NULL UNIQUE,
  dependencia   VARCHAR(150),
  estado        VARCHAR(10) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','pendiente','inactivo')),
  supabase_uid  UUID UNIQUE,
  ultimoacceso  TIMESTAMPTZ,
  creado        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asesorpedagogico (LIKE tutoracademico INCLUDING ALL);
CREATE TABLE IF NOT EXISTS director         (LIKE tutoracademico INCLUDING ALL);

CREATE TABLE IF NOT EXISTS institucion (
  idinstitucion SERIAL PRIMARY KEY,
  nit        VARCHAR(30) NOT NULL UNIQUE,
  nombre     VARCHAR(200) NOT NULL,
  encargado  VARCHAR(150),
  direccion  VARCHAR(200),
  correo     VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS tipopractica (
  idtipo   SERIAL PRIMARY KEY,
  codigo   VARCHAR(20) NOT NULL UNIQUE,
  nombre   VARCHAR(150) NOT NULL,
  semestre INT,
  horas    INT
);

CREATE TABLE IF NOT EXISTS practica (
  idpractica     SERIAL PRIMARY KEY,
  codigo         VARCHAR(30) NOT NULL UNIQUE,
  nombre         VARCHAR(200) NOT NULL,
  idtipo         INT REFERENCES tipopractica(idtipo),
  idinstitucion  INT REFERENCES institucion(idinstitucion),
  docestudiante  VARCHAR(20) NOT NULL REFERENCES estudiante(numdocumento),
  doctutor       VARCHAR(20) REFERENCES tutoracademico(numdocumento),
  docasesor      VARCHAR(20) REFERENCES asesorpedagogico(numdocumento),
  fechainicio    DATE NOT NULL,
  fechafin       DATE NOT NULL,
  estado         VARCHAR(12) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','finalizada','cancelada')),
  -- Bitácora (1 a 1 con la práctica)
  bitacora_creada TIMESTAMPTZ NOT NULL DEFAULT now(),
  notafinal      NUMERIC(3,1) CHECK (notafinal BETWEEN 0 AND 5),
  observaciongeneral TEXT,
  estadobitacora VARCHAR(12) NOT NULL DEFAULT 'activa',
  CHECK (fechafin >= fechainicio)
);

CREATE TABLE IF NOT EXISTS actividad (
  idactividad SERIAL PRIMARY KEY,
  idpractica  INT NOT NULL REFERENCES practica(idpractica) ON DELETE CASCADE,
  numero      INT NOT NULL,
  titulo      VARCHAR(200),
  descripcion TEXT,
  UNIQUE (idpractica, numero)
);

-- Misma estructura que usa evidenciasRoutes.js (+ publicid para poder borrar en Cloudinary)
CREATE TABLE IF NOT EXISTS evidenciaactividad (
  idevidencia   VARCHAR(40) PRIMARY KEY,
  urlarchivo    TEXT NOT NULL,
  nombrearchivo TEXT NOT NULL,
  descripcion   TEXT,
  idactividad   INT NOT NULL REFERENCES actividad(idactividad) ON DELETE CASCADE,
  publicid      TEXT,
  resourcetype  VARCHAR(20),
  fechasubida   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS retroalimentacion (
  idretro     SERIAL PRIMARY KEY,
  idactividad INT NOT NULL REFERENCES actividad(idactividad) ON DELETE CASCADE,
  docautor    VARCHAR(20) NOT NULL,
  rolautor    VARCHAR(10) NOT NULL CHECK (rolautor IN ('tutor','asesor')),
  texto       TEXT NOT NULL,
  fecha       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_practica_est ON practica(docestudiante);
CREATE INDEX IF NOT EXISTS ix_practica_tut ON practica(doctutor);
CREATE INDEX IF NOT EXISTS ix_practica_ase ON practica(docasesor);
CREATE INDEX IF NOT EXISTS ix_evid_act ON evidenciaactividad(idactividad);
CREATE INDEX IF NOT EXISTS ix_retro_act ON retroalimentacion(idactividad);
