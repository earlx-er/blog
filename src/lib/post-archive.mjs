export const postsPerPage = 20;

export function groupPostsByMonth(entries) {
  const groups = [];
  for (const post of entries) {
    const key = post.data.date?.slice(0, 7) || 'draft';
    const last = groups.at(-1);
    if (last?.key === key) last.entries.push(post);
    else groups.push({
      key,
      label: key === 'draft' ? '下書き' : `${key.slice(0, 4)}年${Number(key.slice(5, 7))}月`,
      entries: [post],
    });
  }
  return groups;
}

export const postsPageUrl = (page, sectionPath = '/posts/') => page === 1 ? sectionPath : `${sectionPath}page/${page}/`;
