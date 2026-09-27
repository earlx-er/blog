export function relatedPosts(current, entries, limit = 3) {
  const currentTags = new Set(current.data.tags.map(tag => tag.trim().toLowerCase()));
  return entries.filter(entry => entry.id !== current.id && (entry.data.category === current.data.category || entry.data.tags.some(tag => currentTags.has(tag.trim().toLowerCase()))))
    .map(entry => ({ entry, score: entry.data.tags.filter(tag => currentTags.has(tag.trim().toLowerCase())).length * 10 + Number(entry.data.category === current.data.category) }))
    .sort((a, b) => b.score - a.score || (b.entry.data.date || '').localeCompare(a.entry.data.date || ''))
    .slice(0, limit).map(item => item.entry);
}
