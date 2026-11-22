// Gráficos en SVG sin dependencias externas.
const Graficos = (() => {
  const NS = "http://www.w3.org/2000/svg";

  // Curva de luz: brillo en el tiempo. Las caídas son los posibles tránsitos.
  function curvaDeLuz(datos, color = "var(--acento)") {
    const W = 900, H = 240, m = { i: 56, d: 12, s: 12, b: 32 };
    const min = Math.min(...datos), max = Math.max(...datos), rango = max - min || 1;
    const x = i => m.i + (i / (datos.length - 1)) * (W - m.i - m.d);
    const y = v => m.s + (1 - (v - min) / rango) * (H - m.s - m.b);
    // reducir puntos para dibujar rápido
    const paso = Math.max(1, Math.floor(datos.length / 1200));
    let d = "";
    for (let i = 0; i < datos.length; i += paso) d += (i ? "L" : "M") + x(i).toFixed(1) + " " + y(datos[i]).toFixed(1);
    const fmt = v => Math.abs(v) >= 1000 ? v.toExponential(1) : v.toFixed(0);
    return `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img" aria-label="Curva de luz">
      <line x1="${m.i}" x2="${W - m.d}" y1="${H - m.b}" y2="${H - m.b}" class="eje"/>
      <line x1="${m.i}" x2="${m.i}" y1="${m.s}" y2="${H - m.b}" class="eje"/>
      <text x="${m.i - 6}" y="${m.s + 4}" class="etiqueta" text-anchor="end">${fmt(max)}</text>
      <text x="${m.i - 6}" y="${H - m.b}" class="etiqueta" text-anchor="end">${fmt(min)}</text>
      <text x="${m.i}" y="${H - 10}" class="etiqueta">1</text>
      <text x="${W - m.d}" y="${H - 10}" class="etiqueta" text-anchor="end">${datos.length}</text>
      <text x="${(W + m.i) / 2}" y="${H - 10}" class="etiqueta" text-anchor="middle">Medición (tiempo)</text>
      <path d="${d}" fill="none" stroke="${color}" stroke-width="1"/>
    </svg>`;
  }

  // Matriz de confusión 2x2
  function matriz(mc, titulo) {
    const celda = (v, cls, txt) => `<div class="celda ${cls}"><strong>${v}</strong><small>${txt}</small></div>`;
    return `<div class="matriz">
      <div class="matriz-titulo">${titulo}</div>
      <div class="matriz-cab"></div><div class="matriz-cab">Predice sin planeta</div><div class="matriz-cab">Predice con planeta</div>
      <div class="matriz-lado">Sin planeta</div>${celda(mc.vn, "ok", "verdaderos negativos")}${celda(mc.fp, "mal", "falsas alarmas")}
      <div class="matriz-lado">Con planeta</div>${celda(mc.fn, "mal", "planetas perdidos")}${celda(mc.vp, "ok", "planetas encontrados")}
    </div>`;
  }

  return { curvaDeLuz, matriz };
})();
