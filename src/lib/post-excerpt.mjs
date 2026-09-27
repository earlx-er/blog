export function postExcerpt(body, fallback = '', maxLength = 220) {
  const lines = body
    .replace(/^```[\s\S]*?^```/gm, '')
    .replace(/^~~~[\s\S]*?^~~~/gm, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !/^(?:#{1,6}\s|!\[|<|[-*_]{3,}$|https?:\/\/)/.test(line))
    .map(line => line
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^>\s?/, '')
      .replace(/^[-*+]\s+/, '')
      .replace(/[`*_~]/g, '')
      .trim())
    .filter(Boolean);
  const text = lines.join(' ').replace(/\s+/g, ' ').trim() || fallback.trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}
