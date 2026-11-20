#!/bin/sh
# Étape de build Netlify : donne au service worker un numéro de version unique
# à chaque mise en ligne, pour que les visiteurs reçoivent toujours la dernière version.
set -e
V="tempo-$(printf '%s' "${COMMIT_REF:-$(date +%s)}" | cut -c1-10)"
sed -i.bak "s/^const VERSION = \"[^\"]*\"/const VERSION = \"$V\"/" site/sw.js
rm -f site/sw.js.bak
grep -q "const VERSION = \"$V\"" site/sw.js
echo "Service worker : $V"
