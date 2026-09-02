#!/bin/sh
# Builds og-card.jpg, the 1200x630 image Facebook, X, LinkedIn, Slack, Discord
# and WhatsApp show when someone pastes a link to the site. Every generated
# page points og:image and twitter:image at it, so it has to exist: a missing
# card is not a blank space, it is the platform falling back to whatever
# thumbnail it can scrape, or to nothing at all.
#
# Regenerate with:  sh tools/make_og_card.sh
set -e
cd "$(dirname "$0")/.."

SERIF="/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
SANS="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
SANS_R="/System/Library/Fonts/Supplemental/Arial.ttf"

# The gradient matches the site hero (--navy to --blue) so the card and the
# page a click lands on read as the same thing.
magick -size 1200x630 -define gradient:angle=115 gradient:'#0f2a49-#2d6eb4' \
  -fill '#d9a63a' -draw "roundrectangle 80,86 152,158 18,18" \
  -font "$SANS" -pointsize 34 -fill '#0f2a49' \
  -annotate +99+133 'JL' \
  -font "$SANS" -pointsize 30 -fill '#ffffff' \
  -annotate +176+122 'JLPT Practice' \
  -font "$SANS_R" -pointsize 22 -fill '#a9c6e6' \
  -annotate +176+152 'jlpt.sureshsurkheti.com' \
  -font "$SERIF" -pointsize 78 -fill '#ffffff' \
  -annotate +80+300 'Practise Japanese with' \
  -annotate +80+388 'full-length mock exams.' \
  -font "$SANS_R" -pointsize 30 -fill '#c8dcf2' \
  -annotate +80+452 'Timed papers, automatic marking, word and grammar lists.' \
  og-card.jpg

# The five level chips, drawn as a row so the card says at a glance which
# levels are covered.
X=80
for LV in N5 N4 N3 N2 N1; do
  magick og-card.jpg \
    -fill '#ffffff22' -stroke '#ffffff55' -strokewidth 2 \
    -draw "roundrectangle $X,516 $((X+96)),574 29,29" \
    -stroke none -fill '#ffffff' -font "$SANS" -pointsize 28 \
    -annotate +$((X+30))+555 "$LV" \
    og-card.jpg
  X=$((X+114))
done

# JPEG, not PNG: the card is a photographic gradient, which PNG stores
# losslessly at ~4.5MB. Several platforms quietly skip an image that large.
magick og-card.jpg -strip -interlace Plane -quality 88 og-card.jpg
echo "og-card.jpg: $(magick identify -format '%wx%h %b' og-card.jpg)"
