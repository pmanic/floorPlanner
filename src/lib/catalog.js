export const catalog = [
  { type: 'counter', name: 'Radna površina', category: 'Kuhinja', w: 60, h: 60, kitchen: true },
  { type: 'sink', name: 'Sudopera', category: 'Kuhinja', w: 80, h: 60, kitchen: true },
  { type: 'stove', name: 'Šporet', category: 'Kuhinja', w: 60, h: 60, kitchen: true },
  { type: 'fridge', name: 'Frižider', category: 'Kuhinja', w: 60, h: 60, kitchen: true },
  {
    type: 'dishwasher',
    name: 'Mašina za sudove',
    category: 'Kuhinja',
    w: 60,
    h: 60,
    kitchen: true,
  },
  { type: 'freezer', name: 'Zamrzivač', category: 'Kuhinja', w: 60, h: 60, kitchen: true },
  { type: 'toilet', name: 'WC šolja', category: 'Kupatilo', w: 40, h: 65 },
  { type: 'shower', name: 'Tuš kabina', category: 'Kupatilo', w: 90, h: 90 },
  { type: 'washer', name: 'Veš mašina', category: 'Kupatilo', w: 60, h: 60 },
  { type: 'basin', name: 'Lavabo', category: 'Kupatilo', w: 60, h: 45 },
  { type: 'sofa', name: 'Sofa', category: 'Dnevna soba', w: 210, h: 85 },
  { type: 'table', name: 'Trpezarijski sto', category: 'Dnevna soba', w: 140, h: 85 },
  { type: 'coffee', name: 'Klub sto', category: 'Dnevna soba', w: 100, h: 55 },
  { type: 'plant', name: 'Biljka', category: 'Dnevna soba', w: 45, h: 45 },
  { type: 'bed', name: 'Bračni krevet', category: 'Spavaća soba', w: 160, h: 200 },
  { type: 'wardrobe', name: 'Ormar', category: 'Spavaća soba', w: 160, h: 60 },
];
/** Builds a fresh illustrative apartment. Room labels and areas are examples, not inferred from wall geometry.
 */
export function samplePlan() {
  let count = 0;
  const wall =
    /** Creates a sample wall with a unique ID and centimeter endpoints.
     * @param {any} x Horizontal coordinate in centimeters.
     * @param {any} y Vertical coordinate in centimeters.
     * @param {any} x2 End horizontal coordinate in centimeters.
     * @param {any} y2 End vertical coordinate in centimeters.
     * @param {any} t Wall thickness in centimeters.
     */
    (x, y, x2, y2, t = 15) => ({
      id: `w${++count}`,
      a: { x, y },
      b: { x: x2, y: y2 },
      thickness: t,
    });
  const walls = [
    wall(0, 0, 860, 0, 20),
    wall(860, 0, 860, 620, 20),
    wall(860, 620, 0, 620, 20),
    wall(0, 620, 0, 0, 20),
    wall(540, 0, 540, 620),
    wall(540, 350, 860, 350),
  ];
  const furniture = [];
  const add =
    /** Adds a fresh catalog instance to the illustrative apartment.
     * @param {any} type Catalog discriminator.
     * @param {any} x Horizontal coordinate in centimeters.
     * @param {any} y Vertical coordinate in centimeters.
     * @param {any} rotation Rotation angle in degrees.
     */
    (type, x, y, rotation = 0) =>
      furniture.push({
        ...catalog.find(
          /** Finds the catalog definition for the sample furniture instance.
           * @param {any} i Input for this operation.
           */
          (i) => i.type === type,
        ),
        id: `f${++count}`,
        x,
        y,
        rotation,
      });
  add('fridge', 25, 20);
  add('counter', 85, 20);
  add('sink', 145, 20);
  add('dishwasher', 225, 20);
  add('stove', 285, 20);
  add('counter', 345, 20);
  add('table', 190, 170);
  add('sofa', 45, 425);
  add('coffee', 95, 340);
  add('plant', 450, 535);
  add('plant', 450, 35);
  add('bed', 620, 40);
  add('wardrobe', 595, 270);
  add('shower', 755, 365);
  add('toilet', 570, 375);
  add('basin', 650, 365);
  add('washer', 780, 535);
  return {
    name: 'Moj prvi prostor',
    walls,
    furniture,
    doors: [
      {
        id: 'd1',
        wallId: 'w5',
        x: 540,
        y: 210,
        angle: 90,
        side: -1,
        flip: true,
        width: 85,
        thickness: 15,
      },
      {
        id: 'd2',
        wallId: 'w5',
        x: 540,
        y: 490,
        angle: 90,
        side: -1,
        flip: false,
        width: 80,
        thickness: 15,
      },
      {
        id: 'd3',
        wallId: 'w3',
        x: 375,
        y: 620,
        angle: 180,
        side: 1,
        flip: false,
        width: 95,
        thickness: 20,
      },
    ],
    dimensions: [
      { id: 'm1', a: { x: 0, y: 0 }, b: { x: 540, y: 0 }, offset: -65 },
      { id: 'm2', a: { x: 540, y: 0 }, b: { x: 860, y: 0 }, offset: -65 },
      { id: 'm3', a: { x: 860, y: 0 }, b: { x: 860, y: 620 }, offset: -65 },
    ],
    labels: [
      { x: 270, y: 295, name: 'DNEVNA SOBA I KUHINJA', area: '33,5 m²' },
      { x: 700, y: 245, name: 'SPAVAĆA SOBA', area: '11,2 m²' },
      { x: 695, y: 500, name: 'KUPATILO', area: '8,6 m²' },
    ],
  };
}
