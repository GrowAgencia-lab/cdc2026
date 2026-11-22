/* =====================================================================
 * CUP DANCE COMPETITION 2026 — Plantillas PDF
 *  · PDF de devolución por obra (portal de devoluciones y panel admin)
 *  · Certificado de premio especial (panel admin)
 * Necesita jsPDF 2.5.1 + jspdf-autotable 3.8.2 cargados antes.
 * ===================================================================== */
(function () {
  const ORO = [212, 165, 55], ORO_D = [140, 100, 24], NEGRO = [17, 17, 17], GRIS = [95, 88, 74], CREMA = [251, 246, 233];
  const cacheImg = {};

  async function imagen(url) {
    if (cacheImg[url]) return cacheImg[url];
    const r = await fetch(url);
    const b = await r.blob();
    let d = await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); });
    const tipo = /\.png($|\?)/i.test(url) ? 'image/png' : 'image/jpeg';
    d = 'data:' + tipo + ';base64,' + String(d).split(',')[1];
    cacheImg[url] = d;
    return d;
  }
  const txt = s => String(s == null ? '' : s);
  const nota = n => (n == null || n === '' ? '—' : String(n).replace('.', ','));
  function ajustar(doc, s, max, tam, min) {
    let t = tam; doc.setFontSize(t);
    while (doc.getTextWidth(s) > max && t > (min || 8)) { t -= 0.5; doc.setFontSize(t); }
    return t;
  }

  /** obra = { orden, obra, academia, modalidad, categoria, tipoParticipacion, turno, participantes[], coreografo,
   *           competeCoreografia, resultados:[{jurado,puntaje,puesto,coreo,puestoCoreo}], promedio, puesto,
   *           promedioCoreo, puestoCoreo }  (los premios especiales NO van en este PDF) */
  async function devolucion(obra, opt) {
    opt = opt || {};
    const { jsPDF } = window.jspdf;
    const doc = opt.doc || new jsPDF({ unit: 'mm', format: 'a4' });
    if (opt.doc) doc.addPage();
    const W = 210, M = 14;
    let logo = null;
    try { logo = await imagen(opt.logo || 'logo.png'); } catch (e) {}

    // ---- Encabezado
    doc.setFillColor(...NEGRO); doc.rect(0, 0, W, 44, 'F');
    doc.setFillColor(...ORO); doc.rect(0, 44, W, 1.6, 'F');
    if (logo) doc.addImage(logo, 'PNG', M, 6, 32, 32);
    doc.setTextColor(...ORO); doc.setFont('helvetica', 'bold'); doc.setFontSize(19);
    doc.text('CUP DANCE COMPETITION 2026', 51, 18);
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    doc.text('Circuito Latinoamericano de Danza  ·  Sede Gran Asunción', 51, 25);
    doc.setTextColor(...ORO); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('DEVOLUCIÓN DEL JURADO', 51, 34, { charSpace: 0.8 });
    doc.setFontSize(8); doc.setTextColor(185, 173, 146); doc.text('OBRA N°', W - M, 15, { align: 'right' });
    doc.setFontSize(30); doc.setTextColor(...ORO); doc.text(txt(obra.orden), W - M, 31, { align: 'right' });

    // ---- Datos de la obra
    let y = 58;
    doc.setTextColor(...NEGRO); doc.setFont('helvetica', 'bold');
    const tit = txt(obra.obra || '(sin nombre)').toUpperCase();
    ajustar(doc, tit, W - 2 * M, 20, 12); doc.text(tit, M, y);
    y += 7.5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...ORO_D);
    doc.text(txt(obra.academia), M, y);
    y += 7;
    const chips = [obra.modalidad, obra.categoria, obra.tipoParticipacion, obra.turno ? 'Turno ' + obra.turno : ''].filter(Boolean);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    let x = M;
    chips.forEach(c => {
      const w = doc.getTextWidth(c) + 6;
      if (x + w > W - M) { x = M; y += 7; }
      doc.setDrawColor(...ORO); doc.setFillColor(...CREMA); doc.roundedRect(x, y - 4.2, w, 6, 3, 3, 'FD');
      doc.setTextColor(...NEGRO); doc.text(c, x + 3, y);
      x += w + 2.5;
    });
    if (obra.competeCoreografia === 'Sí') {
      const c = 'Compite por coreografía', w = doc.getTextWidth(c) + 6;
      if (x + w > W - M) { x = M; y += 7; }
      doc.setFillColor(...NEGRO); doc.roundedRect(x, y - 4.2, w, 6, 3, 3, 'F');
      doc.setTextColor(...ORO); doc.text(c, x + 3, y);
    }
    y += 8;
    doc.setFontSize(9); doc.setTextColor(...GRIS);
    const parts = Array.isArray(obra.participantes) ? obra.participantes.join(', ') : txt(obra.participantes);
    if (parts) {
      doc.setFont('helvetica', 'bold'); doc.text((obra.participantes.length > 1 ? 'Intérpretes: ' : 'Intérprete: '), M, y);
      const off = doc.getTextWidth('Intérpretes: ');
      doc.setFont('helvetica', 'normal');
      const lineas = doc.splitTextToSize(parts, W - 2 * M - off);
      doc.text(lineas, M + off, y); y += lineas.length * 4.2;
    }
    if (obra.coreografo) { doc.setFont('helvetica', 'bold'); doc.text('Coreografía: ', M, y); doc.setFont('helvetica', 'normal'); doc.text(txt(obra.coreografo), M + doc.getTextWidth('Coreografía: ') + 1, y); y += 4.2; }

    // ---- Tabla de jurados
    y += 4;
    const coreo = obra.competeCoreografia === 'Sí';
    const head = coreo ? [['Jurado', 'Puntaje', 'Puesto', 'Coreografía', 'Puesto coreografía']] : [['Jurado', 'Puntaje', 'Puesto']];
    const res = obra.resultados || [];
    const body = res.length ? res.map(r => coreo ? [r.jurado, nota(r.puntaje), r.puesto || '—', nota(r.coreo), r.puestoCoreo || '—'] : [r.jurado, nota(r.puntaje), r.puesto || '—'])
      : [[{ content: 'Todavía no hay calificaciones cargadas.', colSpan: coreo ? 5 : 3, styles: { halign: 'center', textColor: GRIS } }]];
    doc.autoTable({
      startY: y, head, body, margin: { left: M, right: M }, theme: 'grid',
      styles: { font: 'helvetica', fontSize: 10.5, cellPadding: 3, lineColor: [226, 216, 194], lineWidth: 0.2, textColor: NEGRO },
      headStyles: { fillColor: NEGRO, textColor: ORO, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: CREMA },
      columnStyles: { 0: { fontStyle: 'bold', halign: 'left' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } }
    });
    y = doc.lastAutoTable.finalY + 8;

    // ---- Resultado final
    const alto = coreo && obra.promedioCoreo != null ? 34 : 24;
    doc.setFillColor(...NEGRO); doc.setDrawColor(...ORO); doc.setLineWidth(0.8);
    doc.roundedRect(M, y, W - 2 * M, alto, 4, 4, 'FD');
    const fila = (yy, etiqueta, prom, puesto) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(185, 173, 146);
      doc.text(etiqueta, M + 8, yy - 6, { charSpace: 0.5 });
      doc.text('RESULTADO', W - M - 8, yy - 6, { align: 'right', charSpace: 0.5 });
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
      doc.text(prom != null ? nota(prom) : '—', M + 8, yy + 1);
      doc.setTextColor(...ORO); doc.text((puesto || 'Pendiente').toUpperCase(), W - M - 8, yy + 1, { align: 'right' });
    };
    fila(y + 15, 'PROMEDIO DEL JURADO', obra.promedio, obra.puesto);
    if (alto > 24) {
      doc.setDrawColor(70, 60, 40); doc.setLineWidth(0.2); doc.line(M + 8, y + 19.5, W - M - 8, y + 19.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(185, 173, 146);
      doc.text('COREOGRAFÍA  ·  promedio ' + nota(obra.promedioCoreo), M + 8, y + 27.5);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...ORO);
      doc.text((obra.puestoCoreo || '—').toUpperCase(), W - M - 8, y + 27.5, { align: 'right' });
    }
    y += alto + 8;

    // ---- Escala y aviso de audio
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...NEGRO);
    doc.text('Escala de evaluación', M, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS);
    doc.text('10 – 9: 1er puesto     ·     8 – 7: 2do puesto     ·     6 – 5: 3er puesto', M, y + 5);
    doc.text('Las devoluciones en audio de cada jurado están disponibles en el Portal de Devoluciones.', M, y + 10);

    // ---- Pie
    const yp = 268;
    doc.setDrawColor(...ORO); doc.setLineWidth(0.3);
    doc.line(M + 10, yp, 92, yp); doc.line(118, yp, W - M - 10, yp);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...NEGRO);
    doc.text('Prof. Francisco González', (M + 10 + 92) / 2, yp + 5, { align: 'center' });
    doc.text('Prof. Patricia Mareco', (118 + W - M - 10) / 2, yp + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text('Dirección General', (M + 10 + 92) / 2, yp + 9, { align: 'center' });
    doc.text('Dirección General', (118 + W - M - 10) / 2, yp + 9, { align: 'center' });
    doc.setFillColor(...NEGRO); doc.rect(0, 286, W, 11, 'F');
    doc.setTextColor(...ORO); doc.setFontSize(8);
    doc.text('22 de noviembre de 2026  ·  Sede Gran Asunción  ·  @cupdancecompetition', W / 2, 292.5, { align: 'center' });
    return doc;
  }

  function nombreArchivo(obra) {
    return ('Devolucion ' + String(obra.orden).padStart(3, '0') + ' - ' + txt(obra.obra)).replace(/[\\/:*?"<>|]/g, '').slice(0, 80) + '.pdf';
  }

  /** Certificado de premio especial sobre la imagen oficial (tamaño carta). */
  async function certificado(datos, opt) {
    opt = opt || {};
    const { jsPDF } = window.jspdf;
    const doc = opt.doc || new jsPDF({ unit: 'mm', format: 'letter' });
    if (opt.doc) doc.addPage('letter');
    const img = await imagen(opt.fondo || '../certificado-premio.jpg');
    doc.addImage(img, 'JPEG', 0, 0, 215.9, 279.4);
    const cx = 107.3, max = 176;
    doc.setFont('times', 'bold'); doc.setTextColor(...ORO_D);
    const premio = txt(datos.premio).toUpperCase();
    ajustar(doc, premio, max, 23, 12); doc.text(premio, cx, 169.5, { align: 'center' });
    doc.setTextColor(...NEGRO);
    const nombre = txt(datos.nombre);
    ajustar(doc, nombre, max, 19, 11); doc.text(nombre, cx, 178.5, { align: 'center' });
    if (datos.detalle) {
      doc.setFont('times', 'italic'); doc.setTextColor(70, 64, 54);
      ajustar(doc, txt(datos.detalle), max, 11, 7); doc.text(txt(datos.detalle), cx, 185.3, { align: 'center' });
    }
    return doc;
  }

  window.CDCPDF = { devolucion, certificado, nombreArchivo, imagen };
})();
