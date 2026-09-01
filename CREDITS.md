# Credits and licensing

## The code

The exam player, the interface, the glossary build pipeline and the twelve
interface translations are the work of **Suresh Surkheti**, MIT licensed. See
[LICENSE](LICENSE).

## Word meanings — attribution required

The English meanings and readings in `data/glossary/` are derived from:

- **[JMdict](https://www.edrdg.org/jmdict/j_jmdict.html)** / the
  [JMdict-simplified](https://github.com/scriptin/jmdict-simplified) release,
  © the Electronic Dictionary Research and Development Group, licensed
  **CC BY-SA 4.0**.
- JLPT level lists from
  [jlpt-vocab-api](https://github.com/wkei/jlpt-vocab-api) and
  [open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks).
- Word segmentation by [janome](https://github.com/mocobeta/janome).

**CC BY-SA 4.0 is a share-alike licence.** If you publish the glossary data,
you must credit EDRDG as above and license the derived glossary data under
CC BY-SA 4.0 as well. This is a condition of use, not a courtesy. The
attribution above is the minimum; keep it visible on the site, not only in
this file.

## The exam papers — read this before deploying

The questions in `data/exams/` are reproduced from **Japanese Language
Proficiency Test** examinations. Those are the copyright of the
**Japan Educational Exchanges and Services (JEES)** and the
**Japan Foundation**.

Facts, not opinions:

- JEES and the Japan Foundation do not license past papers for
  redistribution. They publish sample questions and sell the official
  workbooks (公式問題集); that is all.
- The pages these were extracted from were **removed from their original
  host** (dethitiengnhat.com), which stated it would no longer post official
  exam papers, citing copyright compliance with the Japan Foundation.
- "JLPT" is a trademark of its organisers.

A disclaimer does not create a licence. Publishing this content on a public
site is republishing material a rights holder has already had taken down
once, and no wording on the page changes that.

Safe ways to deploy:

1. **Keep it private.** Run it locally, or put the deploy behind a password
   (Netlify and Vercel both support this, as does Cloudflare Access). Nothing
   is lost — the whole site works.
2. **Publish with your own papers.** Write them into `data/exams-manual/`,
   which is validated on build and labelled "Practice paper" so provenance is
   never misrepresented. Ship the engine, the glossary and the translations,
   which are genuinely yours.

If you publish the archived papers anyway, take them down promptly on request.

## Listening audio

Recordings are embedded from Google Drive files hosted by a third party. They
are not served by this site and are not yours to serve. They may disappear at
any time — one already has.
