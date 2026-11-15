// Line 6, the whole of it: the one table of the airship's stops and their addresses, shared (with bus.js and
// ride.js) by Anna's House, Vesper Street and Cloud Spring Harbor. It imports nothing. ~/projects/my_house/site/src/airship/
// is the source; the town's and the school's copies are kept byte for byte the same.
//
// The line is a circuit: Anna's House, Vesper Street, Cloud Spring Harbor, and round again. At each stop Dandelion is bound
// for the next stop on it, and says so on her blind; ring the bell again while she stands at the stop and the blind
// turns to the other one (ride.js). A stop with no address is not on the line: nothing offers it, names it on a
// timetable or draws it on her map, and the line is exactly what it was without it.
//
//   const R = lineAt('house')       (or 'town', or 'harbor': the stop this site is)
//   R.to        where she can go from here: [{ id, name, blind, url }, ...], the next stop on the circuit first
//   R.from      the stop this visitor has just come from by airship (?from=...), or null
//   R.query     what to send them on with: '?from=house' (each site adds &time= and &quality= as it likes)
//   R.rows      the timetable's rows for this stop, the same words at every stop: [['to', 'Vesper Street'], ...]
//   R.map       the stops to letter on her route map and her suitcase (bus.js): this one and those in R.to
//   R.here, R.local

// ---- Cloud Spring Harbor's public address -------------------------------------------------------------------------
// The one line to change if the school ever moves (keep /site/ and the slash at the end, as the other two have).
// Set to '' it takes the stop off the line at the house and in the town: not offered, not mentioned, as it was
// before there were three.
export const CLOUD_SPRING_HARBOR_ADDRESS = 'https://lab.brezgis.com/site/';

// ---- the stops ------------------------------------------------------------------------------------------------
// address: the public one. also: older or other names a visitor may arrive with in ?from= (they keep working).
// local: this stop's port and path on a test machine, used only by ?line=local (below). ink: its dot on her map.
export const STOPS = {
  house: { name: 'Anna’s House', blind: 'ANNA’S HOUSE', sticker: 'ANNA’S HOUSE', address: 'https://house.brezgis.com/site/', also: [], local: ':8791/', ink: '#a8361f' },
  town: { name: 'Vesper Street', blind: 'VESPER STREET', sticker: 'VESPER ST.', address: 'https://town.brezgis.com/site/', also: ['vesper'], local: ':5188/', ink: '#24382f' },
  harbor: { name: 'Cloud Spring Harbor', blind: 'CLOUD SPRING HARBOR', sticker: 'C. S. HARBOR', address: CLOUD_SPRING_HARBOR_ADDRESS, also: ['school'], local: ':5190/site/', ink: '#2b4a66' },
};
export const CIRCUIT = ['house', 'town', 'harbor'];      // the order she goes round in

// ---- for testing on one machine ---------------------------------------------------------------------------------
// ?line=local sends her between the three test servers on the machine the page itself came from (same host name,
// each stop's own port), and is carried along from stop to stop. It is only heeded when the page was itself loaded
// from a bare IP address or localhost, so it does nothing on a published site, whatever the link says.
const onTestHost = host => /^(localhost|\d{1,3}(\.\d{1,3}){3})$/.test(host ?? '');

export function stopNamed(name) {
  const n = String(name ?? '').toLowerCase();
  return CIRCUIT.find(id => id === n || STOPS[id].also.includes(n)) ?? null;
}

export function lineAt(here, { search = globalThis.location?.search ?? '', host = globalThis.location?.hostname ?? '', scheme = globalThis.location?.protocol ?? 'http:' } = {}) {
  const Q = new URLSearchParams(search), local = Q.get('line') === 'local' && onTestHost(host);
  const url = id => (local ? `${scheme}//${host}${STOPS[id].local}` : STOPS[id].address);
  const came = stopNamed(Q.get('from')), from = came && came !== here ? came : null;
  const at = CIRCUIT.indexOf(here), round = CIRCUIT.map((_, i) => CIRCUIT[(at + 1 + i) % CIRCUIT.length]).filter(id => id !== here && url(id));
  const to = round.map(id => ({ id, name: STOPS[id].name, blind: STOPS[id].blind, url: url(id) }));
  const rows = [
    ...(to.length > 1 ? [['to', to[0].name], ['or', to[1].name], ['to change', 'ring again']] : to.length ? [['to', to[0].name]] : [['today', 'round the island']]),
    ['arrives', 'when rung'], ['departs', 'when aboard'], ...(to.length ? [['journey', 'one cloud']] : []), ['fare', 'a nice thought'],
  ];
  const map = CIRCUIT.filter(id => id === here || round.includes(id)).map(id => ({ id, name: STOPS[id].name, sticker: STOPS[id].sticker, ink: STOPS[id].ink }));
  return { here, local, from, to, rows, map, query: `?from=${here}${local ? '&line=local' : ''}` };
}
