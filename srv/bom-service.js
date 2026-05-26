const cds = require('@sap/cds')

const { BomHeaders, BomItems } = cds.entities('upload.bom')

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to('db')

  this.before('READ', 'BomHeaders', async () => {
    await ensureDemoData(db)
  })

  this.on('uploadBom', async (req) => {
    const { material, plant, bomUsage, alternativeBom, fileName, csvContent } = req.data

    if (!material || !plant || !bomUsage || !csvContent) {
      return req.reject(400, 'Material, plant, BOM usage, and CSV file content are required.')
    }

    await ensureDemoData(db)

    const header = await findOrCreateHeader(db, {
      material,
      plant,
      bomUsage,
      alternativeBom: alternativeBom || '01'
    })

    const rows = parseCsv(csvContent)
    if (!rows.length) {
      return req.reject(400, 'The CSV does not contain any BOM item rows.')
    }

    const existingItems = await SELECT.from(BomItems).where({ parent_ID: header.ID })
    const start = existingItems.length + 1
    const today = new Date().toISOString().slice(0, 10)
    const entries = rows.map((row, index) => ({
      ID: cds.utils.uuid(),
      parent_ID: header.ID,
      itemNo: padItem((start + index) * 10),
      component: required(row, ['component', 'material', 'component_material'], index),
      componentDescription: row.description || row.componentDescription || row.component_description || '',
      quantity: Number(row.quantity || row.qty || 1),
      unit: row.unit || row.uom || 'EA',
      validFrom: row.validFrom || row.valid_from || today,
      validTo: row.validTo || row.valid_to || '9999-12-31',
      changeNumber: row.changeNumber || row.change_number || '',
      sortString: row.sortString || row.sort_string || '',
      itemId: row.itemId || row.item_id || String(Date.now()).slice(-8) + index,
      source: 'Uploaded'
    }))

    await INSERT.into(BomItems).entries(entries)

    return {
      success: true,
      message: `${entries.length} BOM item(s) uploaded from ${fileName || 'CSV file'}.`,
      inserted: entries.length
    }
  })
})

async function ensureDemoData(db) {
  const [{ count }] = await SELECT`count(*) as count`.from(BomHeaders)
  if (count > 0) return

  const headerId = cds.utils.uuid()
  await INSERT.into(BomHeaders).entries({
    ID: headerId,
    material: '3000000814',
    materialText: 'INCORE PE, DW 150MM X 6M (SN4)',
    plant: '1001',
    plantName: 'Accra Plant',
    bomUsage: '1',
    alternativeBom: '01',
    validFrom: '2026-05-15',
    revisionLevel: '',
    changeNumber: ''
  })

  await INSERT.into(BomItems).entries([
    {
      ID: cds.utils.uuid(),
      parent_ID: headerId,
      itemNo: '0010',
      component: '1000000086',
      componentDescription: 'HDPE GRADE B53-35H-011',
      quantity: 56.22,
      unit: 'KG',
      validFrom: '2025-12-16',
      validTo: '9999-12-31',
      itemId: '00000001',
      source: 'Manual'
    },
    {
      ID: cds.utils.uuid(),
      parent_ID: headerId,
      itemNo: '0020',
      component: '1000000087',
      componentDescription: 'MASTER BATCH RED FOR MESH 15167-D',
      quantity: 1.15,
      unit: 'KG',
      validFrom: '2025-12-16',
      validTo: '9999-12-31',
      itemId: '00000002',
      source: 'Manual'
    }
  ])
}

async function findOrCreateHeader(db, input) {
  const [header] = await SELECT.from(BomHeaders).where(input).limit(1)
  if (header) return header

  const ID = cds.utils.uuid()
  await INSERT.into(BomHeaders).entries({
    ID,
    ...input,
    materialText: 'Uploaded BOM Material',
    plantName: `Plant ${input.plant}`,
    validFrom: new Date().toISOString().slice(0, 10),
    revisionLevel: '',
    changeNumber: ''
  })
  return SELECT.one.from(BomHeaders).where({ ID })
}

function parseCsv(content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []

  const headers = splitCsvLine(lines[0]).map((value) => normalizeKey(value))
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || ''
      return row
    }, {})
  })
}

function splitCsvLine(line) {
  const values = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

function normalizeKey(value) {
  return value.trim().replace(/\s+/g, '_').replace(/-+/g, '_').replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function required(row, keys, index) {
  const value = keys.map((key) => row[key]).find(Boolean)
  if (!value) throw new Error(`Missing component value in CSV row ${index + 2}.`)
  return value
}

function padItem(value) {
  return String(value).padStart(4, '0')
}
