// Text matching shared by the app's food search and the server's dish resolver, so both read a name the same way.

/** Lower case, accents dropped, Thai script kept (U+0E00 to U+0E7F), anything else a space. */
export const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\u0e00-\u0e7f ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * A spelling-tolerant key for Thai food names: the common romanisation variants of one word fold to one form (khao and
 * kao, phad and pad, moo and mu, gai and kai, tom yam and tom yum, som tum and som tam, kuay tiew and kway teow) and a
 * plural drops its s. Thai script loses its tone marks and the กระเพรา spelling folds to กะเพรา. Lossy on purpose (khai,
 * egg, folds with kai, chicken), so callers rank a folded match below an exact one.
 */
export const fold = (s: string) => norm(s)
  .replace(/[\u0e48-\u0e4b]/g, '').replace(/กระเพรา/g, 'กะเพรา')
  .replace(/([a-z]{2}(?:sh|ch|x|o))es\b/g, '$1').replace(/([a-z]{2}[a-rt-z])s\b/g, '$1') // no lookbehind: Safari before 16.4 cannot parse it
  .replace(/ph/g, 'p').replace(/kh/g, 'k').replace(/th/g, 't').replace(/\bg/g, 'k').replace(/oo/g, 'u').replace(/\bt(?:iew|eow|iao|iow)\b/g, 'teo').replace(/ow\b/g, 'ao')
  .replace(/ae/g, 'a').replace(/kw/g, 'ku').replace(/\bn(?:eu|ue|u)a\b/g, 'nua')
  .replace(/\byam\b/g, 'yum').replace(/\btum\b/g, 'tam').replace(/d\b/g, 't').replace(/b\b/g, 'p');

/** `fold` with the spaces removed too, for a name typed without them ("krapao", "padthai"); kapao, krapao and kaprao agree. */
export const compact = (s: string) => fold(s).replace(/ /g, '').replace(/yam/g, 'yum').replace(/tum/g, 'tam').replace(/d/g, 't').replace(/b/g, 'p').replace(/g/g, 'k').replace(/k(?:r?a)pr?ao/g, 'kaprao');
