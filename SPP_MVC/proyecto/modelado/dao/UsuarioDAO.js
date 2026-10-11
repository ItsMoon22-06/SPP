'use strict';
const BaseDAO = require('./BaseDAO');

/** Tablas por rol. Son constantes del servidor (nunca provienen del usuario), por eso se pueden interpolar. */
const TABLAS = Object.freeze({
  estudiante: 'estudiante',
  tutor: 'tutoracademico',
  asesor: 'asesorpedagogico',
  director: 'director'
});


// Vista unificada de los 4 roles
const USUARIOS_CTE = `
  WITH u AS (
    SELECT 'estudiante'::text AS rol, e.numdocumento, e.tipodocumento, e.nombres, e.apellidos, e.correo,
           p.nombre AS programa, e.estado, e.supabase_uid, e.ultimoacceso
      FROM estudiante e LEFT JOIN programa p ON p.idprograma = e.idprograma
    UNION ALL SELECT 'tutor',    numdocumento, tipodocumento, nombres, apellidos, correo, dependencia, estado, supabase_uid, ultimoacceso FROM tutoracademico
    UNION ALL SELECT 'asesor',   numdocumento, tipodocumento, nombres, apellidos, correo, dependencia, estado, supabase_uid, ultimoacceso FROM asesorpedagogico
    UNION ALL SELECT 'director', numdocumento, tipodocumento, nombres, apellidos, correo, dependencia, estado, supabase_uid, ultimoacceso FROM director
  )`;

class UsuarioDAO extends BaseDAO {
  constructor() {
    super('practica');
  }

  static get ROLES() {
    return Object.keys(TABLAS);
  }

  #tabla(rol) {
    const t = TABLAS[rol];
    if (!t) throw new Error(`Rol inválido: ${rol}`);
    return t;
  }

  /** Normaliza la fila al formato que ya usa usuarios.js en la vista. */
  static aVista(f) {
    if (!f) return null;
    return {
      id: f.numdocumento,
      rol: f.rol,
      nombres: f.nombres,
      apellidos: f.apellidos,
      docTipo: f.tipodocumento,
      docNumero: f.numdocumento,
      correo: f.correo,
      programa: f.programa || '',
      estado: f.estado,
      ultimoAcceso: f.ultimoacceso
    };
  }

  async buscarPorCorreo(correo) {
    return this.una(`${USUARIOS_CTE} SELECT * FROM u WHERE lower(correo) = lower($1)`, [correo]);
  }

  async buscarPorUid(uid) {
    return this.una(`${USUARIOS_CTE} SELECT * FROM u WHERE supabase_uid = $1`, [uid]);
  }

  async buscarPorDocumento(numDocumento) {
    return this.una(`${USUARIOS_CTE} SELECT * FROM u WHERE numdocumento = $1`, [numDocumento]);
  }

  async listar({ rol, estado, q } = {}) {
    const cond = [];
    const params = [];
    if (rol) { params.push(rol); cond.push(`rol = $${params.length}`); }
    if (estado) { params.push(estado); cond.push(`estado = $${params.length}`); }
    if (q) {
      params.push(`%${q}%`);
      const i = params.length;
      cond.push(`(nombres ILIKE $${i} OR apellidos ILIKE $${i} OR numdocumento ILIKE $${i} OR correo ILIKE $${i})`);
    }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    return this.consultar(`${USUARIOS_CTE} SELECT * FROM u ${where} ORDER BY apellidos, nombres`, params);
  }

  /** Crea el registro del rol. Para estudiantes, `programa` (texto) se resuelve/crea en la tabla programa. */
  async crear(rol, d) {
    const tabla = this.#tabla(rol);
    return this.transaccion(async (c) => {
      if (rol === 'estudiante') {
        const idprograma = await this.#idPrograma(c, d.programa);
        await c.query(
          `INSERT INTO estudiante (numdocumento, tipodocumento, nombres, apellidos, correo, idprograma, estado, supabase_uid)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [d.numDocumento, d.docTipo, d.nombres, d.apellidos, d.correo, idprograma, d.estado, d.supabaseUid]
        );
      } else {
        await c.query(
          `INSERT INTO ${tabla} (numdocumento, tipodocumento, nombres, apellidos, correo, dependencia, estado, supabase_uid)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [d.numDocumento, d.docTipo, d.nombres, d.apellidos, d.correo, d.programa || null, d.estado, d.supabaseUid]
        );
      }
      return d.numDocumento;
    });
  }

  async actualizar(rol, numDocumento, d) {
    const tabla = this.#tabla(rol);
    return this.transaccion(async (c) => {
      if (rol === 'estudiante') {
        const idprograma = await this.#idPrograma(c, d.programa);
        return (await c.query(
          `UPDATE estudiante SET tipodocumento=$2, nombres=$3, apellidos=$4, idprograma=$5, estado=$6 WHERE numdocumento=$1`,
          [numDocumento, d.docTipo, d.nombres, d.apellidos, idprograma, d.estado]
        )).rowCount;
      }
      return (await c.query(
        `UPDATE ${tabla} SET tipodocumento=$2, nombres=$3, apellidos=$4, dependencia=$5, estado=$6 WHERE numdocumento=$1`,
        [numDocumento, d.docTipo, d.nombres, d.apellidos, d.programa || null, d.estado]
      )).rowCount;
    });
  }

  async cambiarEstado(rol, numDocumento, estado) {
    return this.ejecutar(`UPDATE ${this.#tabla(rol)} SET estado=$2 WHERE numdocumento=$1`, [numDocumento, estado]);
  }

  async eliminar(rol, numDocumento) {
    return this.ejecutar(`DELETE FROM ${this.#tabla(rol)} WHERE numdocumento=$1`, [numDocumento]);
  }

  async registrarAcceso(rol, numDocumento) {
    return this.ejecutar(`UPDATE ${this.#tabla(rol)} SET ultimoacceso = now() WHERE numdocumento=$1`, [numDocumento]);
  }

  async #idPrograma(cliente, nombre) {
    if (!nombre) return null;
    const r = await cliente.query(
      `INSERT INTO programa (nombre) VALUES ($1)
       ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING idprograma`,
      [nombre]
    );
    return r.rows[0].idprograma;
  }

  async listarProgramas() {
    return this.consultar('SELECT idprograma, nombre FROM programa ORDER BY nombre');
  }
}

module.exports = UsuarioDAO;
