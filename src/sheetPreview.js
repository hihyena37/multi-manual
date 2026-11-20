export function previewRows(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  const source = text.replace(/\r\n?/g, '\n')

  for (let index = 0; index < source.length && rows.length < 6; index += 1) {
    const char = source[index]
    if (char === '"' && (quoted || cell === '')) {
      if (quoted && source[index + 1] === '"') {
        cell += '"'
        index += 1
      } else quoted = !quoted
    } else if (!quoted && (char === '\t' || char === '\n')) {
      row.push(cell)
      cell = ''
      if (char === '\n') {
        rows.push(row.slice(0, 6))
        row = []
      }
    } else cell += char
  }
  if (rows.length < 6 && (row.length || cell)) rows.push([...row, cell].slice(0, 6))
  return rows
}
