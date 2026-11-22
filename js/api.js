// Cliente del servicio de IA: una función por endpoint.
const Api = (() => {
  let base = (() => {
    try { return localStorage.getItem("api_url") || window.CONFIG.API_URL_POR_DEFECTO; }
    catch { return window.CONFIG.API_URL_POR_DEFECTO; }
  })();

  async function llamar(ruta, opciones = {}) {
    let r;
    try {
      r = await fetch(base.replace(/\/$/, "") + ruta, opciones);
    } catch {
      throw new Error(`No se pudo conectar con la API en ${base}. ¿Está encendida?`);
    }
    const texto = await r.text();
    const cuerpo = texto ? JSON.parse(texto) : null;
    if (!r.ok) {
      const d = cuerpo && cuerpo.detail;
      const msg = Array.isArray(d) ? d.map(e => e.msg).join("; ") : (d || `Error ${r.status}`);
      throw new Error(msg);
    }
    return cuerpo;
  }

  const json = (metodo, cuerpo) => ({
    method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo),
  });
  const archivo = (f) => { const fd = new FormData(); fd.append("archivo", f); return { method: "POST", body: fd }; };

  return {
    get url() { return base; },
    set url(v) { base = v; try { localStorage.setItem("api_url", v); } catch { /* sin almacenamiento */ } },
    salud: () => llamar("/salud"),
    // Predicciones
    predecir: (flux, identificador) => llamar("/predicciones", json("POST", { flux, identificador })),
    predecirArchivo: (f) => llamar("/predicciones/archivo", archivo(f)),
    historial: (limite, desplazamiento, soloConPlaneta) =>
      llamar(`/predicciones?limite=${limite}&desplazamiento=${desplazamiento}&solo_con_planeta=${soloConPlaneta}`),
    detalle: (id) => llamar(`/predicciones/${id}`),
    // Modelo
    metricas: () => llamar("/modelo/metricas"),
    versiones: () => llamar("/modelo/versiones"),
    version: (id) => llamar(`/modelo/versiones/${id}`),
    activar: (id) => llamar(`/modelo/versiones/${id}/activar`, { method: "PUT" }),
    // Entrenamiento
    subirArchivo: (f) => llamar("/entrenamiento/archivos", archivo(f)),
    archivos: () => llamar("/entrenamiento/archivos"),
    reentrenar: (archivoId, activar) => llamar("/modelo/reentrenar", json("POST", { archivo_id: archivoId, activar })),
  };
})();
