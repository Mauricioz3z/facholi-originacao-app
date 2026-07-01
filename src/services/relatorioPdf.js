import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Paleta da marca (mesma usada no dashboard)
const VERDE = [26, 95, 42]        // #1a5f2a
const VERDE_CLARO = [46, 204, 113] // #2ecc71
const LARANJA = [230, 126, 34]    // #e67e22
const VERDE_FECHADO = [39, 174, 96] // #27ae60
const CINZA = [108, 117, 125]

// ---- Formatadores (espelham os do DashboardView) ----
function fmtNumero(v) {
  if (v === null || v === undefined || v === '') return '—'
  return Number(v).toLocaleString('pt-BR')
}

function fmtKg(v) {
  if (!v && v !== 0) return '—'
  return `R$ ${Number(v).toFixed(4).replace('.', ',')}/kg`
}

function fmtPreco3(v) {
  if (!v && v !== 0) return '—'
  return `R$ ${Number(v).toFixed(3).replace('.', ',')}`
}

function fmtPeso(v) {
  if (!v && v !== 0) return '—'
  return `${Number(v).toFixed(1).replace('.', ',')} kg`
}

function fmtCategoria(cat) {
  const min = Math.round(Number(cat.peso_min))
  const max = Math.round(Number(cat.peso_max))
  return `${cat.categoria} ${min}–${max} kg`
}

function agora() {
  return new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// Carrega o logo do /public como dataURL preservando a proporção
function carregarLogo() {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
        resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = '/logo-facholi.png'
  })
}

const NOME_VISAO = {
  compradores: 'Por Comprador',
  corretores: 'Por Corretor',
  categorias: 'Por Categoria'
}

/**
 * Gera e faz o download do relatório do dashboard em PDF.
 * @param {object} ctx
 * @param {string} ctx.visao  'compradores' | 'corretores' | 'categorias'
 * @param {Array<{rotulo:string, valor:string}>} ctx.filtros filtros aplicados (legíveis)
 * @param {object|null} ctx.totais  totais gerais
 * @param {object} ctx.resumo  { negAndamento, cbAndamento, negFechadas, cbFechadas, porCategoria }
 * @param {object} ctx.dados  { compradores, corretores, categorias }
 */
export async function gerarRelatorioDashboard(ctx) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margem = 14
  const logo = await carregarLogo()

  // ===== Cabeçalho =====
  let y = 12
  if (logo) {
    const altura = 14
    const largura = (logo.w / logo.h) * altura
    doc.addImage(logo.dataUrl, 'PNG', margem, y, largura, altura)
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...VERDE)
  doc.text('Resumo de Negociações', pageW - margem, y + 5, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...CINZA)
  doc.text(`Emitido em ${agora()}`, pageW - margem, y + 11, { align: 'right' })
  doc.text(`Visão: ${NOME_VISAO[ctx.visao] || '—'}`, pageW - margem, y + 16, { align: 'right' })

  y += 22
  doc.setDrawColor(...VERDE)
  doc.setLineWidth(0.6)
  doc.line(margem, y, pageW - margem, y)
  y += 6

  // ===== Filtros aplicados =====
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text('Filtros aplicados', margem, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const filtrosTxt = (ctx.filtros || []).map(f => `${f.rotulo}: ${f.valor}`).join('    •    ')
  const linhas = doc.splitTextToSize(filtrosTxt || 'Nenhum filtro', pageW - margem * 2)
  doc.setTextColor(90, 90, 90)
  doc.text(linhas, margem, y)
  y += linhas.length * 4.5 + 3

  // ===== Totalizador geral =====
  if (ctx.totais) {
    autoTable(doc, {
      startY: y,
      head: [['Total Cabeças', 'R$/kg Negociado (méd.)', 'R$/kg Colocado (méd.)', 'Peso Médio']],
      body: [[
        fmtNumero(ctx.totais.qtd_total),
        fmtPreco3(ctx.totais.preco_negociado_medio),
        fmtPreco3(ctx.totais.preco_colocado_medio),
        fmtPeso(ctx.totais.peso_medio)
      ]],
      theme: 'grid',
      styles: { halign: 'center', fontSize: 10, cellPadding: 2.5 },
      headStyles: { fillColor: VERDE, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontStyle: 'bold', textColor: VERDE },
      margin: { left: margem, right: margem }
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ===== Resumo de Cabeças por Categoria =====
  const r = ctx.resumo
  if (r) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text('Cabeças por Categoria', margem, y)
    y += 2

    autoTable(doc, {
      startY: y + 2,
      head: [['Categoria', 'Em Andamento', 'Fechadas']],
      body: (r.porCategoria || []).map(c => [
        fmtCategoria(c),
        fmtNumero(c.cb_andamento),
        fmtNumero(c.cb_fechadas)
      ]),
      foot: [[
        'Total',
        `${fmtNumero(r.cbAndamento)} cb\n(${fmtNumero(r.negAndamento)} neg.)`,
        `${fmtNumero(r.cbFechadas)} cb\n(${fmtNumero(r.negFechadas)} neg.)`
      ]],
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: VERDE, textColor: 255, fontSize: 8 },
      footStyles: { fillColor: [240, 240, 240], textColor: 40, fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right', textColor: LARANJA },
        2: { halign: 'right', textColor: VERDE_FECHADO }
      },
      margin: { left: margem, right: margem }
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ===== Tabela da visão ativa =====
  const tituloVisao = NOME_VISAO[ctx.visao] || 'Detalhamento'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text(tituloVisao, margem, y)

  const tabelaComum = {
    startY: y + 2,
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: VERDE, textColor: 255, fontSize: 8 },
    margin: { left: margem, right: margem }
  }

  if (ctx.visao === 'compradores') {
    const rows = ctx.dados.compradores || []
    autoTable(doc, {
      ...tabelaComum,
      head: [['Comprador', 'Neg.', 'Qtd Total (cab.)', 'R$/kg Neg. (méd.)', 'R$/kg Col. (méd.)', 'Peso Médio']],
      body: rows.map(x => [
        x.comprador_nome,
        fmtNumero(x.total_negociacoes),
        fmtNumero(x.qtd_total),
        fmtKg(x.preco_negociado_medio),
        fmtKg(x.preco_colocado_medio),
        fmtPeso(x.peso_medio)
      ]),
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right' }, 2: { halign: 'right' },
        3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }
      }
    })
  } else if (ctx.visao === 'corretores') {
    const rows = ctx.dados.corretores || []
    autoTable(doc, {
      ...tabelaComum,
      head: [['Corretor', 'Categorias', 'Qtd Total (cab.)', 'R$/kg Neg. (méd.)', 'R$/kg Col. (méd.)', 'Peso Médio']],
      body: rows.map(x => [
        x.corretor_nome,
        fmtNumero(x.categorias?.length || 0),
        fmtNumero(x.agregados?.qtdTotal),
        fmtKg(x.agregados?.precoNegociadoMedio),
        fmtKg(x.agregados?.precoColocadoMedio),
        fmtPeso(x.agregados?.pesoMedio)
      ]),
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right' }, 2: { halign: 'right' },
        3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }
      }
    })
  } else {
    const rows = ctx.dados.categorias || []
    autoTable(doc, {
      ...tabelaComum,
      head: [['Categoria', 'Neg.', 'Total (cab.)', 'Em And.', 'Fechadas', 'R$/kg Neg. (méd.)', 'R$/kg Col. (méd.)']],
      body: rows.map(x => [
        fmtCategoria(x),
        fmtNumero(x.total_negociacoes),
        fmtNumero(x.qtd_total),
        fmtNumero(x.cb_andamento),
        fmtNumero(x.cb_fechadas),
        fmtKg(x.preco_negociado_medio),
        fmtKg(x.preco_colocado_medio)
      ]),
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right' }, 2: { halign: 'right' },
        3: { halign: 'right', textColor: LARANJA },
        4: { halign: 'right', textColor: VERDE_FECHADO },
        5: { halign: 'right' }, 6: { halign: 'right' }
      }
    })
  }

  // ===== Rodapé (paginação) =====
  const totalPaginas = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...CINZA)
    doc.text('PreçoBoi — Facholi', margem, pageH - 8)
    doc.text(`Página ${i} de ${totalPaginas}`, pageW - margem, pageH - 8, { align: 'right' })
  }

  const dataArq = new Date().toISOString().slice(0, 10)
  doc.save(`resumo-negociacoes-${dataArq}.pdf`)
}
