'use strict';
const BaseDAO = require('./BaseDAO');

class InstitucionDAO extends BaseDAO {
  constructor() {
    super('practica');
  }

  listar() {
    return this.consultar('SELECT idinstitucion, nit, nombre, encargado, direccion, correo FROM institucion ORDER BY nombre');
  }

  obtener(id) {
    return this.una('SELECT idinstitucion, nit, nombre, encargado, direccion, correo FROM institucion WHERE idinstitucion=$1', [id]);
  }

  crear(d) {
    return this.una(
      `INSERT INTO institucion (nit, nombre, encargado, direccion, correo) VALUES ($1,$2,$3,$4,$5)
       RETURNING idinstitucion, nit, nombre, encargado, direccion, correo`,
      [d.nit, d.nombre, d.encargado, d.direccion, d.correo]
    );
  }

  actualizar(id, d) {
    return this.ejecutar(
      'UPDATE institucion SET nit=$2, nombre=$3, encargado=$4, direccion=$5, correo=$6 WHERE idinstitucion=$1',
      [id, d.nit, d.nombre, d.encargado, d.direccion, d.correo]
    );
  }

  eliminar(id) {
    return this.ejecutar('DELETE FROM institucion WHERE idinstitucion=$1', [id]);
  }
}

module.exports = InstitucionDAO;
