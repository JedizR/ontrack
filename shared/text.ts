// Text matching shared by the app's food search and the server's dish resolver, so both read a name the same way.

/** Lower case, accents dropped, Thai script kept (U+0E00 to U+0E7F), anything else a space. */
export const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\u0e00-\u0e7f ]+/g, ' ').replace(/\s+/g, ' ').trim();
