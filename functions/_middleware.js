/* Tempo : une seule adresse officielle, tempo-training.com.
   tempo-2er.pages.dev et www.tempo-training.com redirigent (301) vers https://tempo-training.com, même chemin.
   Les aperçus de branche (xxx.tempo-2er.pages.dev) ne sont pas redirigés. */
const HOME = "tempo-training.com";
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === "tempo-2er.pages.dev" || url.hostname === "www." + HOME) {
    url.hostname = HOME; url.protocol = "https:"; url.port = "";
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
