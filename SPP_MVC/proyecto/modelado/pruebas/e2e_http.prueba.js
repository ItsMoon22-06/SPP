process.env.DATABASE_URL_ESTUDIANTE='postgres://spp:spp@localhost/spp_est';
process.env.DATABASE_URL_EVALUACION='postgres://spp:spp@localhost/spp_eva';
process.env.DB_SSL='false'; process.env.PORT='4100';
process.env.SUPABASE_URL='http://fake'; process.env.SUPABASE_ANON_KEY='a'; process.env.SUPABASE_SERVICE_ROLE_KEY='s';
const root='' + require('path').join(__dirname,'..','..') + '/'; const assert=require('assert');
const { Module } = require('module');
// ---- Supabase simulado ----
const cuentas=new Map(); // email -> {id,password}
const tokens=new Map();  // token -> uid
let n=0;
const fake={ createClient:()=>({ auth:{
  signInWithPassword: async({email,password})=>{ const c=cuentas.get(email); if(!c||c.password!==password) return {data:null,error:{message:'Invalid login'}};
     const t='tok'+(++n); tokens.set(t,c.id); return {data:{user:{id:c.id},session:{access_token:t,refresh_token:'r'+n,expires_in:3600}},error:null}; },
  getUser: async(t)=> tokens.has(t)?{data:{user:{id:tokens.get(t)}},error:null}:{data:null,error:{message:'bad'}},
  refreshSession: async()=>({data:null,error:{message:'no'}}),
  admin:{ createUser: async({email,password})=>{ if(cuentas.has(email)) return {data:null,error:{message:'already registered'}}; const id=require('crypto').randomUUID(); cuentas.set(email,{id,password}); return {data:{user:{id}},error:null}; },
          deleteUser: async(id)=>{ for(const [k,v] of cuentas) if(v.id===id) cuentas.delete(k); return {error:null}; },
          updateUserById: async(id,{password})=>{ for(const v of cuentas.values()) if(v.id===id) v.password=password; return {error:null}; },
          signOut: async()=>({error:null}) } } }) };
const orig=Module._load; Module._load=function(req,...r){ if(req==='@supabase/supabase-js') return fake; return orig.call(this,req,...r); };
// ---- Cloudinary simulado ----
const cl=require(root+'modelado/config/CloudinaryConfig');
cl.uploader={ upload_stream:(o,cb)=>({ end:(buf)=>setImmediate(()=>cb(null,{secure_url:'https://res.cloudinary.com/x/'+buf.length,public_id:'pid'+buf.length,resource_type:'raw'})) }), destroy: async()=>({}) };

(async()=>{
  const PG=require(root+'modelado/config/PostgresConexion');
  // limpiar y sembrar un director en DB + cuenta fake
  for(const t of ['retroalimentacion','evidenciaactividad','actividad','practica','estudiante','tutoracademico','asesorpedagogico','director','tipopractica','institucion','programa']) await PG.pool('practica').query(`TRUNCATE ${t} RESTART IDENTITY CASCADE`);
  for(const t of ['retropregunta','respuesta','evaluacion','pregunta']) await PG.pool('evaluacion').query(`TRUNCATE ${t} RESTART IDENTITY CASCADE`);
  const UD=new (require(root+'modelado/dao/UsuarioDAO'))();
  const uidD=require('crypto').randomUUID(); cuentas.set('director@universidad.edu.co',{id:uidD,password:'Director123'});
  await UD.crear('director',{numDocumento:'900',docTipo:'CC',nombres:'Valentina',apellidos:'Ortiz',correo:'director@universidad.edu.co',programa:'Dirección',estado:'activo',supabaseUid:uidD});

  const Servidor=require(root+'main/Servidor'); const srv=new Servidor().iniciar();
  await new Promise(r=>setTimeout(r,500));
  const B='http://localhost:4100';
  class Cli{ constructor(){this.c={};}
    async f(m,url,body,extra={}){ const h={'X-SPP':'1',...extra}; if(body&&!(body instanceof FormData)){h['Content-Type']='application/json';}
      h.Cookie=Object.entries(this.c).map(([k,v])=>k+'='+v).join('; ');
      const r=await fetch(B+url,{method:m,headers:h,body:body instanceof FormData?body:body?JSON.stringify(body):undefined,redirect:'manual'});
      for(const sc of r.headers.getSetCookie?.()||[]){ const [kv]=sc.split(';'); const [k,v]=kv.split('='); if(/Max-Age=0|Expires=Thu, 01 Jan 1970/.test(sc)) delete this.c[k]; else this.c[k]=v; }
      let d={}; try{d=await r.json();}catch{} return {s:r.status,d,h:r.headers}; } }
  const ok=(c,m)=>{ assert.ok(c,m); console.log('  ✔',m); };

  console.log('# Autenticación');
  const dir=new Cli(); let r;
  r=await dir.f('POST','/api/auth/login',{usuario:'director',password:'mala',rol:'director'}); ok(r.s===401,'contraseña incorrecta -> 401');
  r=await dir.f('POST','/api/auth/login',{usuario:'director',password:'Director123',rol:'tutor'}); ok(r.s===403,'rol equivocado -> 403');
  r=await new Cli().f('POST','/api/auth/login',{usuario:'director',password:'Director123',rol:'director'},{'X-SPP':''}); ok(r.s===403,'sin cabecera CSRF -> 403');
  r=await dir.f('POST','/api/auth/login',{usuario:'director',password:'Director123',rol:'director'}); ok(r.s===200&&r.d.destino==='/HTML/director.html','login director OK');
  ok(!!dir.c.spp_at,'cookie de sesión establecida');
  r=await dir.f('GET','/api/auth/sesion'); ok(r.d.rol==='director'&&r.d.nombres==='Valentina','GET sesión');
  r=await dir.f('GET','/HTML/director.html'); ok(r.s===200,'director ve su panel');
  r=await dir.f('GET','/HTML/tutor.html'); ok(r.s===302&&r.h.get('location')==='/HTML/director.html','director no entra al panel del tutor (redirige al suyo)');

  console.log('# Director crea datos');
  r=await dir.f('POST','/api/tipos-practica',{nombre:'Observación Pedagógica',semestre:3,horas:120}); ok(r.s===201,'tipo creado '+r.d.tipo?.codigo); const idTipo=r.d.tipo.idtipo;
  r=await dir.f('POST','/api/instituciones',{nit:'900-1',nombre:'Colegio San José',encargado:'Ana',direccion:'Calle 1',correo:'c@x.co'}); ok(r.s===201,'institución creada'); const idInst=r.d.institucion.idinstitucion;
  r=await dir.f('POST','/api/instituciones',{nit:'900-1',nombre:'Dup',encargado:'A',direccion:'C',correo:'c@x.co'}); ok(r.s===409,'NIT duplicado -> 409');
  const mk=(rol,doc,nom,mail,prog)=>dir.f('POST','/api/usuarios',{rol,docNumero:doc,docTipo:'CC',nombres:nom,apellidos:'Apellido',correo:mail,pass:'Clave12345',programa:prog,estado:'activo'});
  ok((await mk('estudiante','1001','Edwin','edwin','Licenciatura X')).s===201,'estudiante creado');
  ok((await mk('tutor','1002','Ramiro','ramiro','Facultad')).s===201,'tutor creado');
  ok((await mk('asesor','1003','Claudia','claudia','Normal')).s===201,'asesor creado');
  ok((await mk('estudiante','1004','Otro','otro','Licenciatura X')).s===201,'segundo estudiante creado');
  r=await mk('estudiante','1001','X','x2','L'); ok(r.s===409,'documento duplicado -> 409');
  r=await dir.f('POST','/api/usuarios',{rol:'tutor',docNumero:'5',docTipo:'CC',nombres:'a',apellidos:'b',correo:'z',pass:'corta',programa:'x'}); ok(r.s===400,'contraseña débil -> 400');
  r=await dir.f('GET','/api/usuarios'); ok(r.d.usuarios.length===5,'listado: 5 usuarios (incluye director)');
  r=await dir.f('POST','/api/practicas',{idTipo:idTipo,idInstitucion:idInst,docEstudiante:'1001',docTutor:'1002',docAsesor:'1003',fechaInicio:'2026-02-01',fechaFin:'2026-06-30'}); ok(r.s===201,'práctica creada '+r.d.practica?.codigo); const idPr=r.d.practica.id;
  r=await dir.f('POST','/api/practicas',{idTipo:idTipo,idInstitucion:idInst,docEstudiante:'1002',docTutor:'1002',docAsesor:'1003',fechaInicio:'2026-02-01',fechaFin:'2026-06-30'}); ok(r.s===400,'estudiante con rol incorrecto -> 400');
  r=await dir.f('POST','/api/practicas',{idTipo:idTipo,idInstitucion:idInst,docEstudiante:'1001',docTutor:'1002',docAsesor:'1003',fechaInicio:'2026-07-01',fechaFin:'2026-06-30'}); ok(r.s===400,'fechas invertidas -> 400');

  console.log('# Estudiante');
  const est=new Cli(); r=await est.f('POST','/api/auth/login',{usuario:'edwin',password:'Clave12345',rol:'estudiante'}); ok(r.s===200,'login estudiante (usuario sin dominio)');
  r=await est.f('GET','/api/practicas'); ok(r.d.practicas.length===1&&r.d.practicas[0].tutor.startsWith('Ramiro'),'ve solo su práctica');
  r=await est.f('GET','/api/usuarios'); ok(r.s===403,'no puede listar usuarios -> 403');
  r=await est.f('POST','/api/practicas',{}); ok(r.s===403,'no puede crear prácticas -> 403');
  r=await est.f('GET','/api/practicas/'+idPr+'/actividades'); ok(r.d.actividades.length===6,'6 actividades');
  const act1=r.d.actividades[0].idactividad;
  let fd=new FormData(); fd.append('archivo',new Blob(['hola mundo'],{type:'text/plain'}),'tarea.txt'); fd.append('descripcion','Mi evidencia');
  r=await est.f('POST','/api/actividades/'+act1+'/evidencias',fd); ok(r.s===201&&r.d.evidencia.url.startsWith('https://res.cloudinary.com'),'sube evidencia a Cloudinary + BD'); const idEv=r.d.evidencia.id;
  fd=new FormData(); fd.append('archivo',new Blob(['MZ'],{type:'application/x-msdownload'}),'virus.exe');
  r=await est.f('POST','/api/actividades/'+act1+'/evidencias',fd); ok(r.s===400,'tipo de archivo no permitido -> 400');
  r=await est.f('GET','/api/actividades/'+act1+'/evidencias'); ok(r.d.evidencias.length===1,'lista evidencias');
  r=await est.f('PUT','/api/evidencias/'+idEv,{descripcion:'editada'}); ok(r.d.evidencia.descripcion==='editada','edita descripción');

  console.log('# Aislamiento entre usuarios');
  const est2=new Cli(); await est2.f('POST','/api/auth/login',{usuario:'otro',password:'Clave12345',rol:'estudiante'});
  r=await est2.f('GET','/api/practicas'); ok(r.d.practicas.length===0,'otro estudiante no ve la práctica');
  r=await est2.f('GET','/api/actividades/'+act1+'/evidencias'); ok(r.s===404,'otro estudiante no accede a evidencias ajenas (404)');
  r=await est2.f('DELETE','/api/evidencias/'+idEv); ok(r.s===404,'otro estudiante no puede borrar evidencia ajena');

  console.log('# Tutor y asesor');
  const tut=new Cli(); await tut.f('POST','/api/auth/login',{usuario:'ramiro',password:'Clave12345',rol:'tutor'});
  r=await tut.f('GET','/api/practicas'); ok(r.d.practicas.length===1,'tutor ve su práctica');
  r=await tut.f('POST','/api/preguntas',{enunciado:'¿Retos de la inclusión?',tema:'pedagogia',tipoPractica:'observacion',tipoPregunta:'abierta',valor:2}); ok(r.s===201&&/^PRG-\d+$/.test(r.d.pregunta.codigo),'tutor crea pregunta');
  const idPreg=r.d.pregunta.id;
  r=await tut.f('POST','/api/preguntas',{enunciado:'',tema:'pedagogia',tipoPregunta:'abierta',valor:2}); ok(r.s===400,'enunciado vacío -> 400');
  r=await tut.f('POST','/api/practicas/'+idPr+'/preguntas',{idPregunta:idPreg}); ok(r.s===201,'tutor asigna pregunta a la práctica'); 
  r=await tut.f('POST','/api/actividades/'+act1+'/retroalimentaciones',{texto:'Buen trabajo'}); ok(r.s===201&&r.d.retroalimentacion.rol==='tutor','tutor retroalimenta');
  r=await tut.f('PATCH','/api/practicas/'+idPr+'/bitacora',{notaFinal:4.5,observacionGeneral:'Muy bien'}); ok(r.d.practica.bitacora.notaFinal==='4.5'||r.d.practica.bitacora.notaFinal===4.5,'tutor registra nota');
  r=await tut.f('PATCH','/api/practicas/'+idPr+'/bitacora',{notaFinal:9}); ok(r.s===400,'nota fuera de rango -> 400');
  r=await tut.f('POST','/api/actividades/'+act1+'/evidencias',(()=>{const f=new FormData();f.append('archivo',new Blob(['x'],{type:'text/plain'}),'a.txt');return f;})()); ok(r.s===403,'tutor no puede subir evidencias');
  const ase=new Cli(); await ase.f('POST','/api/auth/login',{usuario:'claudia',password:'Clave12345',rol:'asesor'});
  r=await ase.f('POST','/api/actividades/'+act1+'/retroalimentaciones',{texto:'Sugiero ampliar'}); ok(r.s===201&&r.d.retroalimentacion.rol==='asesor','asesor retroalimenta');
  r=await ase.f('POST','/api/preguntas',{}); ok(r.s===403,'asesor no administra el banco de preguntas');
  r=await est.f('GET','/api/actividades/'+act1+'/retroalimentaciones'); ok(r.d.retroalimentaciones.length===2,'estudiante ve ambas retroalimentaciones');

  console.log('# Preguntas del estudiante');
  r=await est.f('GET','/api/practicas/'+idPr+'/preguntas'); ok(r.d.preguntas.length===1&&r.d.preguntas[0].estado==='pendiente','estudiante ve pregunta pendiente'); const idResp=r.d.preguntas[0].id;
  r=await est.f('PUT','/api/respuestas/'+idResp,{texto:'',enviar:true}); ok(r.s===400,'no envía respuesta vacía');
  r=await est.f('PUT','/api/respuestas/'+idResp,{texto:'borrador',enviar:false}); ok(r.d.estado==='borrador','guarda borrador');
  r=await est.f('PUT','/api/respuestas/'+idResp,{texto:'Respuesta final',enviar:true}); ok(r.d.estado==='respondida','envía respuesta');
  r=await tut.f('POST','/api/respuestas/'+idResp+'/retro',{texto:'Excelente enfoque'}); ok(r.s===201,'tutor retroalimenta la respuesta');
  r=await est.f('GET','/api/practicas/'+idPr+'/preguntas'); ok(r.d.preguntas[0].observacion==='Excelente enfoque','estudiante ve la observación');

  console.log('# Informes y cierre');
  r=await dir.f('GET','/api/informes/resumen'); ok(r.d.resumen.practicas===1,'resumen general');
  r=await dir.f('POST','/api/informes/generar',{anio:2026}); ok(r.s===502||r.s===200,'generar indicadores (Mongo no configurado en la prueba -> '+r.s+')');
  r=await dir.f('PATCH','/api/usuarios/1004/estado',{estado:'inactivo'}); ok(r.d.usuario.estado==='inactivo','director desactiva usuario');
  const o=new Cli(); r=await o.f('POST','/api/auth/login',{usuario:'otro',password:'Clave12345',rol:'estudiante'}); ok(r.s===403,'usuario inactivo no entra');
  r=await dir.f('DELETE','/api/usuarios/1001'); ok(r.s===409,'no se elimina usuario con prácticas -> 409');
  r=await dir.f('DELETE','/api/usuarios/900'); ok(r.s===409,'el director no puede eliminarse a sí mismo');
  r=await dir.f('DELETE','/api/usuarios/1004'); ok(r.s===200,'elimina usuario sin prácticas');
  r=await est.f('POST','/api/auth/logout',{}); ok(!est.c.spp_at,'logout limpia cookies');
  r=await est.f('GET','/api/auth/sesion'); ok(r.s===401,'sin sesión -> 401');
  r=await new Cli().f('GET','/api/usuarios'); ok(r.s===401,'anónimo -> 401');
  console.log('\nTODO OK'); srv.http.close(); await PG.cerrar(); process.exit(0);
})().catch(e=>{console.error('\nFALLO:',e.message,'\n',e.stack?.split('\n').slice(1,4).join('\n'));process.exit(1)});
