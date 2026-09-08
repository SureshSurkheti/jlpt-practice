"""The site's own address, in one place.

It was written out in four files - the two builders, the figure probe and the
script that draws the social card - and a move means changing all four or
shipping a page that points somewhere else. The same duplication had already
put the guides on a stale stylesheet for weeks, so this is the version that
cannot drift.

Changing SITE is the whole of a domain move on this side: rebuild and every
canonical, hreflang, og:url and sitemap entry follows.
"""

SITE = "https://nihongomock.com"

# Without the scheme, for the social card and anywhere the bare host reads
# better than a URL.
HOST = SITE.split("//", 1)[-1]
