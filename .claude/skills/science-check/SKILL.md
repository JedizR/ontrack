---
name: science-check
description: Verify a scientific constant, equation or training rule against its primary source before it enters the engine. Use in M2, and whenever docs/SCIENCE.md or constants.ts changes.
---
# Science check

Every entry in `docs/SCIENCE.md` section 9 starts as provisional. Nothing ships as verified from memory.

1. Group the provisional entries by source paper. Start one `source-checker` subagent per group, in parallel. Give each the entry ids, the claimed values and the citation.
2. Each checker finds the primary source (publisher page, PubMed, PMC or the official dataset), reads the relevant passage, and returns for each entry: confirmed, corrected (with the right value) or not found, plus authors, year, journal, DOI or URL, and where in the paper the value sits.
3. Write the results into `docs/SOURCES.md`: one row per entry. Update `status` in `constants.ts` to `verified`, or change the value and note it in `docs/DECISIONS.md`.
4. A corrected value changes behaviour: update the test vectors in `docs/SCIENCE.md` and the unit tests in the same commit.
5. An entry that stays not found keeps `status: 'provisional'`, and the app's sources screen labels it as a working assumption.

Rules: cite only what was opened and read. A search snippet is not a source. Prefer the paper over a summary of it. If two sources disagree, record both and keep the more conservative value.
