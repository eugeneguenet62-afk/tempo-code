#!/bin/sh
# Copie le code vers le dépôt public (tempo-code), sans les contenus sous licence RepDB :
# illustrations des exercices (site/img/ex) et consignes adaptées de RepDB (site/guides.js).
# Usage : sh scripts/export-public.sh ../tempo-code
set -e
DEST="$1"
[ -n "$DEST" ] && [ -d "$DEST/.git" ] || { echo "Usage : sh scripts/export-public.sh CHEMIN_DU_DEPOT_PUBLIC"; exit 1; }
cd "$(dirname "$0")/.."
find "$DEST" -mindepth 1 -maxdepth 1 ! -name .git ! -name docs ! -name README.md -exec rm -rf {} +
tar --exclude='site/img/ex' --exclude='site/guides.js' --exclude='.git' -cf - site functions scripts netlify.toml firestore.rules TEST-IPHONE.md .gitignore | tar -xf - -C "$DEST"
echo "Copié vers $DEST (sans site/img/ex ni site/guides.js)"
