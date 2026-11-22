// Lógica de la interfaz.
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (v) => v == null ? "—" : (v * 100).toFixed(1) + " %";
const num = (v, d = 3) => v == null ? "—" : Number(v).toFixed(d);
const fecha = (t) => t ? new Date(t.replace(" ", "T") + "Z").toLocaleString("es-BO") : "—";

function aviso(msg, tipo = "info") {
  const a = $("#aviso");
  a.textContent = msg; a.className = `aviso visible ${tipo}`;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove("visible"), 4500);
}

async function conCarga(boton, fn) {
  const texto = boton.textContent;
  boton.disabled = true; boton.classList.add("cargando");
  try { return await fn(); }
  catch (e) { aviso(e.message, "error"); }
  finally { boton.disabled = false; boton.classList.remove("cargando"); boton.textContent = texto; }
}

const chip = (pred) => pred === 1
  ? '<span class="chip planeta">Con planeta</span>' : '<span class="chip">Sin planeta</span>';
const barra = (p) => `<div class="barra"><span style="width:${(p * 100).toFixed(1)}%"></span></div><small>${pct(p)}</small>`;
const real = (r) => r == null ? "—" : (r === 1 ? "Con planeta" : "Sin planeta");

// ------------------------------------------------------------ conexión
async function comprobarConexion() {
  const e = $("#estado-api");
  try {
    const s = await Api.salud();
    e.textContent = `Conectado · modelo ${s.modelo_activo}`; e.className = "estado ok";
  } catch {
    e.textContent = "Sin conexión"; e.className = "estado error";
  }
}

// ------------------------------------------------------------ pestañas
const cargadores = {};
$$(".pestana").forEach(b => b.addEventListener("click", () => {
  $$(".pestana").forEach(x => x.classList.toggle("activa", x === b));
  $$(".vista").forEach(v => v.classList.toggle("activa", v.id === "vista-" + b.dataset.vista));
  cargadores[b.dataset.vista]?.();
}));

// ------------------------------------------------------------ predecir
let archivoPrediccion = null;
$("#archivo-prediccion").addEventListener("change", (ev) => {
  archivoPrediccion = ev.target.files[0] || null;
  $("#nombre-prediccion").textContent = archivoPrediccion ? archivoPrediccion.name : "";
  $("#btn-predecir").disabled = !archivoPrediccion;
});
const zona = $("#zona-prediccion");
zona.addEventListener("dragover", (e) => { e.preventDefault(); zona.classList.add("arrastrando"); });
zona.addEventListener("dragleave", () => zona.classList.remove("arrastrando"));
zona.addEventListener("drop", (e) => {
  e.preventDefault(); zona.classList.remove("arrastrando");
  archivoPrediccion = e.dataTransfer.files[0];
  $("#nombre-prediccion").textContent = archivoPrediccion.name; $("#btn-predecir").disabled = false;
});

async function clasificar(archivo) {
  const res = await Api.predecirArchivo(archivo);
  const filas = res.resultados.map(r => `
    <tr data-id="${r.id}" class="clicable">
      <td>${esc(r.identificador)}</td><td>${chip(r.prediccion)}</td><td>${barra(r.probabilidad)}</td>
      <td>${real(r.etiqueta_real)}</td><td>${esc(r.modelo_version)}</td></tr>`).join("");
  $("#resultado-prediccion").innerHTML = `
    <div class="tarjeta">
      <div class="resumen">
        <div><strong>${res.total}</strong><small>estrellas clasificadas</small></div>
        <div class="destacado"><strong>${res.con_planeta}</strong><small>con planeta</small></div>
        <div><strong>${num(res.resultados[0]?.umbral, 3)}</strong><small>umbral de decisión</small></div>
      </div>
      <table><thead><tr><th>Estrella</th><th>Resultado</th><th>Probabilidad de planeta</th><th>Etiqueta real</th><th>Modelo</th></tr></thead>
      <tbody>${filas}</tbody></table>
      <p class="ayuda">Haz clic en una fila para ver su curva de luz.</p>
      <div id="curva-prediccion"></div>
    </div>`;
  $$("#resultado-prediccion tr.clicable").forEach(tr =>
    tr.addEventListener("click", () => mostrarCurva(tr.dataset.id, "#curva-prediccion")));
  if (res.total === 1) mostrarCurva(res.resultados[0].id, "#curva-prediccion");
  comprobarConexion();
}

$("#btn-predecir").addEventListener("click", (e) => conCarga(e.target, () => clasificar(archivoPrediccion)));
$$(".ejemplo").forEach(b => b.addEventListener("click", () => conCarga(b, async () => {
  const r = await fetch(b.dataset.archivo);
  if (!r.ok) throw new Error("No se encontró el archivo de ejemplo.");
  const nombre = b.dataset.archivo.split("/").pop();
  await clasificar(new File([await r.blob()], nombre, { type: "text/csv" }));
})));

async function mostrarCurva(id, destino) {
  const d = await Api.detalle(id);
  $(destino).innerHTML = `
    <div class="curva">
      <div class="titulo-fila"><h3>${esc(d.identificador || "Predicción " + d.id)}</h3>${chip(d.prediccion)}</div>
      ${Graficos.curvaDeLuz(d.datos, d.prediccion === 1 ? "var(--planeta)" : "var(--acento)")}
      <p class="ayuda">Predicción #${d.id} · probabilidad ${pct(d.probabilidad)} · modelo ${esc(d.modelo_version)} · ${fecha(d.creado_en)}
        · ${d.datos.length} valores enviados</p>
    </div>`;
}

// ------------------------------------------------------------ historial
const pag = { limite: 15, desplazamiento: 0, total: 0 };
async function cargarHistorial() {
  try {
    const h = await Api.historial(pag.limite, pag.desplazamiento, $("#solo-planeta").checked);
    pag.total = h.total;
    $("#tabla-historial").innerHTML = h.items.length ? `
      <table><thead><tr><th>#</th><th>Fecha</th><th>Estrella</th><th>Origen</th><th>Resultado</th><th>Probabilidad</th><th>Etiqueta real</th><th>Modelo</th></tr></thead>
      <tbody>${h.items.map(p => `<tr data-id="${p.id}" class="clicable">
        <td>${p.id}</td><td>${fecha(p.creado_en)}</td><td>${esc(p.identificador || "—")}</td><td>${p.origen.toUpperCase()}</td>
        <td>${chip(p.prediccion)}</td><td>${barra(p.probabilidad)}</td><td>${real(p.etiqueta_real)}</td><td>${esc(p.modelo_version)}</td></tr>`).join("")}
      </tbody></table>` : '<p class="vacio">Todavía no hay predicciones.</p>';
    const hasta = Math.min(pag.desplazamiento + pag.limite, pag.total);
    $("#pag-info").textContent = pag.total ? `${pag.desplazamiento + 1}–${hasta} de ${pag.total}` : "";
    $("#pag-anterior").disabled = pag.desplazamiento === 0;
    $("#pag-siguiente").disabled = hasta >= pag.total;
    $$("#tabla-historial tr.clicable").forEach(tr => tr.addEventListener("click", async () => {
      $("#detalle-historial").innerHTML = '<div class="tarjeta" id="curva-historial"></div>';
      await mostrarCurva(tr.dataset.id, "#curva-historial").catch(e => aviso(e.message, "error"));
      $("#detalle-historial").scrollIntoView({ behavior: "smooth" });
    }));
  } catch (e) { $("#tabla-historial").innerHTML = `<p class="vacio">${esc(e.message)}</p>`; }
}
cargadores.historial = () => { pag.desplazamiento = 0; cargarHistorial(); };
$("#btn-actualizar-historial").addEventListener("click", cargarHistorial);
$("#solo-planeta").addEventListener("change", cargadores.historial);
$("#pag-anterior").addEventListener("click", () => { pag.desplazamiento = Math.max(0, pag.desplazamiento - pag.limite); cargarHistorial(); });
$("#pag-siguiente").addEventListener("click", () => { pag.desplazamiento += pag.limite; cargarHistorial(); });

// ------------------------------------------------------------ métricas
function bloqueMetricas(titulo, m, nota) {
  if (!m) return "";
  return `<div class="tarjeta">
    <h2>${titulo}</h2><p class="ayuda">${nota}</p>
    <div class="kpis">
      ${m.ap != null ? `<div><strong>${num(m.ap, 2)}</strong><small>AP (área bajo precisión-recall)</small></div>` : ""}
      <div><strong>${pct(m.recall)}</strong><small>Recall: planetas encontrados</small></div>
      <div><strong>${pct(m.precision)}</strong><small>Precisión: aciertos al decir "planeta"</small></div>
      <div><strong>${num(m.f1, 2)}</strong><small>F1</small></div>
    </div>
    ${m.matriz_confusion ? Graficos.matriz(m.matriz_confusion, "Matriz de confusión") : ""}
  </div>`;
}

async function cargarMetricas() {
  try {
    const m = await Api.metricas();
    const cv = m.metricas?.validacion_cruzada, pr = m.metricas?.prueba, prod = m.monitoreo_produccion;
    $("#contenido-metricas").innerHTML = `
      <div class="tarjeta">
        <h2>Modelo activo: ${esc(m.version)}</h2>
        <div class="kpis">
          <div><strong>${esc(m.algoritmo)}</strong><small>algoritmo</small></div>
          <div><strong>${num(m.umbral, 3)}</strong><small>umbral de decisión</small></div>
          <div><strong>${cv?.estrellas ?? "—"}</strong><small>estrellas de entrenamiento</small></div>
          <div><strong>${cv?.con_planeta ?? "—"}</strong><small>con planeta</small></div>
        </div>
        <details><summary>Hiperparámetros</summary><pre>${esc(JSON.stringify(m.hiperparametros, null, 2))}</pre></details>
      </div>
      ${bloqueMetricas("Validación cruzada (5 pliegues)", cv, "Cada estrella de entrenamiento se predijo con un modelo que no la había visto.")}
      ${bloqueMetricas("Conjunto de prueba (exoTest)", pr, `Datos nunca usados para entrenar: ${pr?.estrellas ?? ""} estrellas, ${pr?.con_planeta ?? ""} con planeta.`)}
      ${prod ? bloqueMetricas("Monitoreo en uso", {
        recall: prod.vp + prod.fn ? prod.vp / (prod.vp + prod.fn) : null,
        precision: prod.vp + prod.fp ? prod.vp / (prod.vp + prod.fp) : null,
        f1: (2 * prod.vp) / (2 * prod.vp + prod.fp + prod.fn || 1),
        matriz_confusion: prod,
      }, `Predicciones hechas por esta versión que llegaron con etiqueta real (${prod.predicciones_con_etiqueta}).`) : ""}`;
  } catch (e) { $("#contenido-metricas").innerHTML = `<div class="tarjeta"><p class="vacio">${esc(e.message)}</p></div>`; }
}

async function cargarVersiones() {
  try {
    const vs = await Api.versiones();
    $("#tabla-versiones").innerHTML = `<table><thead><tr><th>Versión</th><th>Estado</th><th>AP (CV)</th><th>F1 (CV)</th><th>Umbral</th><th>Creada</th><th></th></tr></thead>
      <tbody>${vs.map(v => `<tr>
        <td>${esc(v.version)} ${v.activo ? '<span class="chip activo">Activa</span>' : ""}</td>
        <td><span class="chip ${v.estado}">${v.estado}</span>${v.mensaje_error ? `<small class="error-txt">${esc(v.mensaje_error)}</small>` : ""}</td>
        <td>${num(v.metricas?.validacion_cruzada?.ap, 3)}</td><td>${num(v.metricas?.validacion_cruzada?.f1, 3)}</td>
        <td>${num(v.umbral, 3)}</td><td>${fecha(v.creado_en)}</td>
        <td>${!v.activo && v.estado === "listo" ? `<button class="btn secundario chico" data-activar="${v.id}">Activar</button>` : ""}</td>
      </tr>`).join("")}</tbody></table>`;
    $$("[data-activar]").forEach(b => b.addEventListener("click", () => conCarga(b, async () => {
      const v = await Api.activar(b.dataset.activar);
      aviso(`Versión ${v.version} activada.`, "ok"); cargarMetricas(); cargarVersiones(); comprobarConexion();
    })));
  } catch (e) { $("#tabla-versiones").innerHTML = `<p class="vacio">${esc(e.message)}</p>`; }
}
cargadores.metricas = () => { cargarMetricas(); cargarVersiones(); };
$("#btn-actualizar-versiones").addEventListener("click", cargarVersiones);

// ------------------------------------------------------------ entrenamiento
let archivoEntrenamiento = null;
$("#archivo-entrenamiento").addEventListener("change", (ev) => {
  archivoEntrenamiento = ev.target.files[0] || null;
  $("#nombre-entrenamiento").textContent = archivoEntrenamiento
    ? `${archivoEntrenamiento.name} (${(archivoEntrenamiento.size / 1e6).toFixed(1)} MB)` : "";
  $("#btn-subir").disabled = !archivoEntrenamiento;
});

async function cargarArchivos() {
  try {
    const as = await Api.archivos();
    $("#sel-archivo").innerHTML = as.length
      ? as.map(a => `<option value="${a.id}">#${a.id} · ${esc(a.nombre_original)} (${a.filas} estrellas, ${a.positivos} con planeta)</option>`).join("")
      : '<option value="">Primero envía un archivo</option>';
    $("#btn-reentrenar").disabled = !as.length;
    $("#tabla-archivos").innerHTML = as.length ? `<table><thead><tr><th>#</th><th>Archivo</th><th>Estrellas</th><th>Con planeta</th><th>Tamaño</th><th>Enviado</th></tr></thead>
      <tbody>${as.map(a => `<tr><td>${a.id}</td><td>${esc(a.nombre_original)}</td><td>${a.filas}</td><td>${a.positivos}</td>
        <td>${(a.tamano_bytes / 1e6).toFixed(1)} MB</td><td>${fecha(a.subido_en)}</td></tr>`).join("")}</tbody></table>`
      : '<p class="vacio">Todavía no se envió ningún archivo.</p>';
  } catch (e) { $("#tabla-archivos").innerHTML = `<p class="vacio">${esc(e.message)}</p>`; }
}
cargadores.entrenamiento = cargarArchivos;

$("#btn-subir").addEventListener("click", (e) => conCarga(e.target, async () => {
  $("#msg-subida").innerHTML = '<p class="ayuda">Enviando y validando el archivo…</p>';
  const a = await Api.subirArchivo(archivoEntrenamiento);
  $("#msg-subida").innerHTML = `<p class="exito">Archivo #${a.id} guardado: ${a.filas} estrellas, ${a.positivos} con planeta.</p>`;
  await cargarArchivos(); $("#sel-archivo").value = a.id;
}).finally(() => { if (!$("#msg-subida .exito")) $("#msg-subida").innerHTML = ""; }));

$("#btn-reentrenar").addEventListener("click", (e) => conCarga(e.target, async () => {
  const id = Number($("#sel-archivo").value);
  const r = await Api.reentrenar(id, $("#chk-activar").checked);
  const caja = $("#estado-reentrenamiento"), inicio = Date.now();
  caja.innerHTML = `<p class="progreso"><span class="giro"></span>Entrenando versión #${r.modelo_id}…</p>`;
  let v;
  do {
    await new Promise(ok => setTimeout(ok, 3000));
    v = await Api.version(r.modelo_id);
    caja.querySelector(".progreso").lastChild.textContent = ` Entrenando versión ${v.version}… ${Math.round((Date.now() - inicio) / 1000)} s`;
  } while (v.estado === "entrenando");
  if (v.estado === "error") throw new Error("El reentrenamiento falló: " + v.mensaje_error);
  const m = v.metricas.validacion_cruzada;
  caja.innerHTML = `<p class="exito">Versión ${esc(v.version)} lista${v.activo ? " y activa" : ""}.
    AP ${num(m.ap, 3)} · recall ${pct(m.recall)} · precisión ${pct(m.precision)} · F1 ${num(m.f1, 2)}</p>`;
  aviso("Reentrenamiento terminado.", "ok"); comprobarConexion();
}));

// ------------------------------------------------------------ inicio
$("#api-url").value = Api.url;
$("#btn-conectar").addEventListener("click", () => { Api.url = $("#api-url").value.trim(); comprobarConexion(); });
comprobarConexion();
