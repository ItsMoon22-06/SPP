-- =====================================================================
-- BASE "Evaluación" (DATABASE_URL_EVALUACION) — esquema PROPUESTO (ver nota en schema_practica.sql)
-- idpractica referencia a la otra base: no hay FK entre bases, lo valida el controlador.
-- =====================================================================
CREATE TABLE IF NOT EXISTS pregunta (
  idpregunta   SERIAL PRIMARY KEY,
  enunciado    TEXT NOT NULL,
  tema         VARCHAR(20) NOT NULL DEFAULT 'pedagogia' CHECK (tema IN ('pedagogia','didactica','evaluacion')),
  tipopractica VARCHAR(30),
  tipopregunta VARCHAR(20) NOT NULL DEFAULT 'abierta',
  valor        SMALLINT NOT NULL DEFAULT 1 CHECK (valor BETWEEN 1 AND 5),
  docautor     VARCHAR(20) NOT NULL,
  fecha        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluacion (
  idevaluacion SERIAL PRIMARY KEY,
  idpractica   INT NOT NULL UNIQUE,
  fecha        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS respuesta (
  idrespuesta  SERIAL PRIMARY KEY,
  idevaluacion INT NOT NULL REFERENCES evaluacion(idevaluacion) ON DELETE CASCADE,
  idpregunta   INT NOT NULL REFERENCES pregunta(idpregunta) ON DELETE CASCADE,
  texto        TEXT,
  estado       VARCHAR(12) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','borrador','respondida')),
  fecha        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (idevaluacion, idpregunta)
);

CREATE TABLE IF NOT EXISTS retropregunta (
  idretro     SERIAL PRIMARY KEY,
  idrespuesta INT NOT NULL REFERENCES respuesta(idrespuesta) ON DELETE CASCADE,
  docautor    VARCHAR(20) NOT NULL,
  texto       TEXT NOT NULL,
  fecha       TIMESTAMPTZ NOT NULL DEFAULT now()
);
