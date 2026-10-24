export function draftBelongsToMessage(draft, messageId) {
  return Boolean(draft && draft.messageId === messageId)
}

export function questionsFromAlertMessage(text) {
  return (text || '').split('\n')
    .map(line => line.match(/^\s*[•-]\s+\*?Q\d+:\*?\s+(.+)$/))
    .filter(Boolean)
    .map(match => ({ question_text: match[1], need_category: 'assessment' }))
}

export function campaignFromAlertMessage(text, fallback) {
  const lines = (text || '').split('\n')
  const titleLine = lines.find(line => /Assessment published/i.test(line)) ?? lines[1]
  const title = titleLine
    ? titleLine.replace(/^\*+|\*+$/g, '').replace(/\s+—\s+Assessment published.*$/i, '').trim()
    : fallback.campaignName

  const areaLine = lines.find(line => /^\*Area:\*\s+.+$/.test(line) || /^Area:\s+.+$/.test(line))
  if (!areaLine) return { ...fallback, campaignName: title }

  const area = areaLine.replace(/^\*Area:\*\s+/, '').replace(/^Area:\s+/, '')
  const [barangay, ...municipalityParts] = area.split(',')
  return {
    campaignName: title,
    barangay: barangay.trim() || fallback.barangay,
    municipality: municipalityParts.join(',').trim() || fallback.municipality,
  }
}
