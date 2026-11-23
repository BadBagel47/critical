// The game has moved (D-269, R-1248): the old address on GitHub Pages sends everyone on to the game on Cloudflare,
// where the rooms for online play are. The rest of the address goes along, so a link to a room or to the play-test
// list still leads to it. Saves stay behind with the old address: a browser keeps them for each address apart.
(function (where) {
  if (where.hostname !== 'badbagel47.github.io') return;
  var rest = where.pathname.replace(/^\/critical\/?/, '');
  where.replace('https://critical.l8p1.workers.dev/' + rest + where.search + where.hash);
})(location);
