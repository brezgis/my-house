// The showroom: ?showroom=<group> sets the kit's pieces out in a row on the front lawn, on a
// patch of floor against a plaster wall, each with a card giving its name and triangle count,
// and photoscanned models alongside for comparison. Groups: soft, wood, kitchen, bath, light,
// props. The row runs along plan X at plan Y = -30, facing the street; stand at
// view=<x>,0,40,0,-0.1 to look at it (world x = X - 21.665).

export function showroom(K, group = 'soft') {
  const { B, fr } = K, Y = -30, H = 0.03;
  const tris = () => { let n = 0; for (const { list } of B.batches.values()) for (const g of list) n += g.attributes.position.count / 3; return n; };
  let X = 21.665 - 18;
  const all = [];
  const card = (f, name, n) => K.sign(f, 0, 0.05, 0.35, 2.4, 0.5, (g, w, h) => { g.fillStyle = '#f3efe6'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.font = 'bold 34px Helvetica, sans-serif'; g.fillText(name, 12, 44); g.font = '26px Helvetica, sans-serif'; g.fillText(`${n} triangles`, 12, 86); }, { cw: 480, ch: 100 });
  // place(name, width, fn): fn(frame) builds the piece in a frame on the wall, facing the street
  const place = (name, w, fn, depth = 0) => {
    const f = fr(X + w / 2, Y, H, 2), t0 = tris();
    fn(f);
    const n = Math.round(tris() - t0); all.push([name, n]);
    card(fr(X + w / 2, Y - 3.6 - depth, H, 2), name, n);
    X += w + 1.2;
  };
  const scan = (id, w, o = {}) => { const f = fr(X + w / 2, Y - 1.5, H, 2); K.model(id, f, 0, 0, 0, 0, o); card(fr(X + w / 2, Y - 3.6, H, 2), id + ' (scan)', 0); X += w + 1.2; };
  const g = group || 'soft';
  if (g === 'soft') {
    place('sofa 7.8', 7.8, f => K.sofa(f, 7.8));
    scan('ArmChair_01', 3);
    place('armchair', 3, f => K.armchair(f, K.SAGE, K.CREAM));
    place('ottoman', 2.6, f => K.ottoman(f, 0, 1.2, {}));
    scan('Ottoman_01', 2.4);
    place('pouf', 1.8, f => K.pouf(f, 0, 1.0));
    place('bed 5.3', 5.6, f => K.bed(f, 5.3, K.SAGE, { accent: K.MUSTARD }));
    place('bed upholstered 4.6', 5.2, f => K.bed(f, 4.6, K.ROSE, { headboard: 'upholstered', sham: K.CREAM, foot: false }));
    scan('vintage_day_bed', 6.5);
  } else if (g === 'wood') {
    place('table 4.2x2.3x1.35', 4.2, f => K.table(f.sub(0, 1.4), 4.2, 2.3, 1.35));
    place('dining table + chairs', 7.2, f => { const t = f.sub(0, 2.5); K.diningTable(t, 7.2, 3.5); K.diningChair(t, -1.6, -2.3, { dq: 0 }); K.diningChair(t, 1.6, -2.3, { back: 'spindle' }); K.diningChair(t, -4.3, 0, { dq: 3, arms: true }); });
    scan('painted_wooden_chair_01', 2);
    place('desk', 4.6, f => K.desk(f, 4.6, 2.3));
    place('dresser', 4.2, f => K.dresser(f, 4.2, 3.1));
    place('nightstand', 1.8, f => K.nightstand(f));
    scan('drawer_cabinet', 2.5);
    place('console', 4, f => K.console(f, 4));
    place('sideboard', 6, f => K.sideboard(f, 6));
    place('side tables', 5.5, f => { K.sideTable(f, -1.9, 1.2, { kind: 'round' }); K.sideTable(f, 0, 1.2, { kind: 'square' }); K.sideTable(f, 1.9, 1.2, { kind: 'drum' }); });
    scan('side_table_01', 2);
    place('plant stand', 1.5, f => K.plantStand(f, 0, 0.8));
    place('bookcase', 4.6, f => K.bookcase(f, 4.6, 6.8));
    place('wardrobe', 4, f => K.wardrobe(f, 4, 6.9));
    place('closet rail', 5, f => K.closetRail(f, 5, { shoes: 4 }));
    place('hall tree', 3.4, f => K.hallTree(f, 3.4));
    place('coat rack', 2, f => K.coatRack(f, 0, 1.2));
    place('shoe rack', 2.8, f => K.shoeRack(f, 2.8));
    place('boot tray', 2.6, f => K.bootTray(f, 0, 1.0, 2.4));
  } else if (g === 'kitchen') {
    place('cabinets + apron sink', 7.5, f => K.cabinets(f, 7.5, { top: 'marble', sink: { x: 0, apron: true } }));
    place('cabinets + undermount', 5, f => K.cabinets(f, 5, { top: K.HONEY, sink: { x: -0.5, w: 2.2, apron: false, tap: K.NICKEL } }));
    place('upper cabinets glazed', 4.5, f => { K.cabinets(f, 4.5, { top: 'marble' }); K.upperCabinets(f, 4.5, { glass: 'prairie' }); });
    place('upper cabinets', 3, f => K.upperCabinets(f, 3, {}));
    place('open shelves', 5, f => K.openShelves(f, 5, [4.4, 5.6]));
    place('plate rack', 2.6, f => K.plateRack(f, 2.6));
    place('pot rail', 4, f => K.potRail(f, 4, 5.4));
    place('range hood', 3.4, f => { K.rangeHood(f, 3.2, {}); K.model('electric_stove', f, 0, 1.1, 0, 0); });
    place('range hood copper', 3.4, f => K.rangeHood(f, 3.2, { kind: 'copper' }));
  } else if (g === 'bath') {
    place('claw-foot tub', 6.4, f => K.clawTub(f, {}));
    place('pedestal sink', 2.2, f => { K.pedestalSink(f, 0); K.mirror(f, 0, 5.0, 1.6, 2.2, { kind: 'arch', frame: K.OAK }); });
    place('vanity', 3.4, f => { K.vanity(f, 3.2); K.mirror(f, 0, 4.9, 2.4, 2.4, {}); K.soapDish(f, 1.15, 1.2, 2.87); K.toothbrushCup(f, -1.2, 0.5, 2.87); K.pumpBottle(f, 1.3, 0.35, 2.87); });
    place('toilet', 2.2, f => K.toilet(f, 0));
    place('towel rail', 2.6, f => { K.towelRail(f, 0, 3.9, 2.2); K.bathMat(f, 0, 1.4, 2.4, 1.6); });
    place('round mirror', 2.4, f => K.mirror(f, 0, 4.5, 2.0, 2.0, { kind: 'round', frame: K.BRASS, border: 0.1 }));
    place('folded towels', 2, f => { K.table(f.sub(0, 0.8), 1.8, 1.4, 2.4); K.foldedStack(f, 0, 0.8, 2.4, 4, ['wool#e6e0d4', 'wool#8d9a82', 'wool#e6e0d4', 'wool#c9b9a6']); });
  } else if (g === 'light') {
    place('table lamps', 6, f => { K.table(f.sub(0, 1), 6, 1.6, 2.4); K.tableLamp(f, -2, 1, 2.4); K.tableLamp(f, 0, 1, 2.4, 'c#b9a27a/0.4', { base: 'gourd', shade: 'drum' }); K.tableLamp(f, 2, 1, 2.4, 'c#3d4b44/0.4', { base: 'column', shade: 'empire' }); });
    place('floor lamps', 3, f => { K.floorLamp(f, -0.7, 1); K.floorLamp(f, 0.8, 1, { shade: 'pleat' }); });
    place('candles', 3, f => { K.table(f.sub(0, 1), 3, 1.6, 2.4); K.candle(f, -1, 1, 2.4, 0.6); K.candle(f, -0.6, 1.1, 2.4, 0.45); K.jarCandle(f, 0.2, 1, 2.4, { label: 'c#c9b48a/0.6' }); K.pillarCandle(f, 1.0, 1, 2.4); });
    place('sconces', 4.5, f => { K.sconce(f, -1.6, 5.2, { kind: 'tulip' }); K.sconce(f, 0, 5.2, { kind: 'shade' }); K.sconce(f, 1.6, 5.2, { kind: 'lantern' }); });
    place('ceiling lights', 6, f => { f.box('c#cfc6b2/0.9', -3, 3, 0, 3, 8.2, 8.4); K.ceilingLight(f, -2, 1.5, 8.2, { kind: 'lantern' }); K.ceilingLight(f, 0, 1.5, 8.2, { kind: 'schoolhouse' }); K.ceilingLight(f, 2, 1.5, 8.2, { kind: 'bowl' }); });
  } else if (g === 'props') {
    place('vessels & flowers', 4, f => { K.table(f.sub(0, 1), 4, 1.6, 2.4); K.mug(f, -1.5, 1, 2.4, K.WHITE, true); K.cup(f, -1.0, 1, 2.4); K.posy(f, -0.2, 1, 2.4); K.vase(f, 0.8, 1, 2.4, 0.7, 0.16); K.plate(f, 1.5, 1, 2.4); });
    place('reading & screens', 5, f => { K.table(f.sub(0, 1), 5, 1.8, 2.4); K.magazines(f, -1.8, 1, 2.4, 4); K.openBook(f, -0.6, 1, 2.4); K.laptop(f, 0.8, 1, 2.4); K.laptop(f, 2.0, 0.9, 2.4, { open: false }); K.phone(f, 1.7, 1.5, 2.4); K.remote(f, -1.2, 1.5, 2.4); });
    place('bathroom things', 4, f => { K.table(f.sub(0, 1), 4, 1.6, 2.4); K.tissueBox(f, -1.4, 1, 2.4); K.lotionTube(f, -0.6, 1.2, 2.4); K.pumpBottle(f, -0.2, 0.8, 2.4); K.perfume(f, 0.3, 1, 2.4); K.cosmetics(f, 0.9, 1, 2.4); K.soapDish(f, 1.6, 1, 2.4); K.toothbrushCup(f, 1.6, 0.5, 2.4); });
    place('laundry, bag, slippers', 4, f => { K.laundry(f, -1.2, 1, 0); K.toteBag(f, 0.4, 1, 0); K.slippers(f, 1.5, 1.2, 0); });
    place('umbrella stand', 2, f => K.umbrellaStand(f, 0, 1));
    place('plants', 6, f => { K.pottedPlant(f, -2.2, 1.2, 0, 'leafy', { size: 1.4 }); K.pottedPlant(f, -0.6, 1.2, 0, 'snake'); K.pottedPlant(f, 0.9, 1.2, 0, 'fern'); K.pottedPlant(f, 2.3, 1.2, 0, 'trailing'); });
    place('pictures', 6, f => { K.picture(f, 'sunflowers', -1.5, 5, 1.7, 2.14, { border: 0.13 }); K.picture(f, 'plan_details', 1.5, 5, 1.9, 2.0, { frame: K.BLACK, border: 0.07, mat: 0.2 }); });
    place('drapes (right one stops at a wall)', 6, f => { f.box('c#cfc6b2/0.9', -2, 2, 0, 0.05, 2.5, 7.2); f.box('plaster', 2.1, 2.4, 0, 3, 0, 8.5); K.drapes(f, -2, 2, 0.12, 7.2, 'drape', { maxRight: 0.1 }); });
    place('throws', 6, f => { K.table(f.sub(0, 1.2), 5, 2, 1.4); K.throwBlanket(f, -2.2, -0.4, 0.5, 1.9, 1.4); K.throwBlanket(f, 0.4, 2.2, 0.5, 1.9, 1.4, K.RUST, { over: 'front' }); });
    place('clothes', 5, f => { f.box(K.BRASS, -2.4, 2.4, 0.95, 1.0, 5.45, 5.5); K.clothes(f, -2.4, 2.4, 0.97, 5.5); K.shoeRow(f, -2, 2, 1.0, 0, 4); });
  }
  const span = [21.665 - 18 - 1, X];
  B.pbox('plaster', span[0], span[1], Y, Y + 0.3, 0, 9.2);
  B.pbox('floor', span[0], span[1], Y - 6, Y, 0, H);
  console.log('SHOWROOM ' + g + ' ' + all.map(([n, t]) => `${n}=${t}`).join(' | ') + ` | x from ${(span[0] - 21.665).toFixed(1)} to ${(span[1] - 21.665).toFixed(1)}`);
}
