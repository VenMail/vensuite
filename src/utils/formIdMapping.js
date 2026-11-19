export function mapSavedFormIds(sentPages, savedPages) {
  const pages = {}, questions = {};
  for (let i = 0; i < sentPages.length; i++) {
    const sent = sentPages[i], saved = savedPages[i];
    if (!saved) continue;
    pages[sent.id] = saved.id;
    for (let j = 0; j < (sent.question_order ?? []).length; j++) {
      if (saved.question_order?.[j]) questions[sent.question_order[j]] = saved.question_order[j];
    }
  }
  return { pages, questions };
}
