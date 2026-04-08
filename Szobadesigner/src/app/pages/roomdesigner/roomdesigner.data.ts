export interface CanvasPoint {
  x: number;
  y: number;
}

export interface FurnitureItem {
  name: string;
  label: string;
  image: string;
  previewImage?: string;
  category: string;
}

export interface FloorType {
  name: string;
  image: string;
  previewImage?: string;
}

export interface RugType {
  name: string;
  label: string;
  image: string;
  previewImage?: string;
}

export interface SavedRoomLayout {
  version?: number;
  name?: string;
  wallPoints?: CanvasPoint[];
  selectedFloor?: FloorType | null;
  objects?: any[];
  [key: string]: any;
}

export interface SavedRoomSummary {
  id: number;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export const DOOR_WINDOW_ITEMS: FurnitureItem[] = [
  { name: 'door', label: 'Ajtó', image: '/furniture/door.png', previewImage: '/previews/furniture/door.png', category: 'Nappali' },
  { name: 'window', label: 'Ablak', image: '/furniture/window.png', previewImage: '/previews/furniture/window.png', category: 'Nappali' },
];

export const FURNITURE_ITEMS: FurnitureItem[] = [
  { name: 'sofa', label: 'Szófa', image: '/furniture/sofa.png', previewImage: '/previews/furniture/sofa.png', category: 'Nappali' },
  { name: 'table', label: 'Asztal', image: '/furniture/livingroom_table.png', previewImage: '/previews/furniture/livingroom_table.png', category: 'Nappali' },
  { name: 'couch', label: 'Kanapé', image: '/furniture/couch.png', previewImage: '/previews/furniture/couch.png', category: 'Nappali' },
  { name: 'chair', label: 'Irodai szék', image: '/furniture/gamingchair.png', previewImage: '/previews/furniture/gamingchair.png', category: 'Nappali' },
  { name: 'footrest', label: 'Lábtartó', image: '/furniture/footrest.png', previewImage: '/previews/furniture/footrest.png', category: 'Nappali' },
  { name: 'cafetable', label: 'Kávézóasztal', image: '/furniture/mini_cafetable.png', previewImage: '/previews/furniture/mini_cafetable.png', category: 'Nappali' },
  { name: 'TV', label: 'TV', image: '/furniture/tv.png', previewImage: '/previews/furniture/tv.png', category: 'Nappali' },
  { name: 'table-small', label: 'Asztal', image: '/furniture/table.png', previewImage: '/previews/furniture/table.png', category: 'Nappali' },
  { name: 'sink', label: 'Mosdó', image: '/furniture/sink.png', previewImage: '/previews/furniture/sink.png', category: 'Fürdőszoba' },
  { name: 'toilet', label: 'Toalett', image: '/furniture/toilet.png', previewImage: '/previews/furniture/toilet.png', category: 'Fürdőszoba' },
  { name: 'bathtub', label: 'Kád', image: '/furniture/bathtub.png', previewImage: '/previews/furniture/bathtub.png', category: 'Fürdőszoba' },
  { name: 'bidet', label: 'Bidé', image: '/furniture/bidet.png', previewImage: '/previews/furniture/bidet.png', category: 'Fürdőszoba' },
  { name: 'shower', label: 'Zuhanyzó', image: '/furniture/shower.png', previewImage: '/previews/furniture/shower.png', category: 'Fürdőszoba' },
  { name: 'washing-machine', label: 'Mosógép', image: '/furniture/washing_machine.png', previewImage: '/previews/furniture/washing_machine.png', category: 'Fürdőszoba' },
  { name: 'medicine-cabinet', label: 'Szekrény', image: '/furniture/medicine_cabinet.png', previewImage: '/previews/furniture/medicine_cabinet.png', category: 'Fürdőszoba' },
  { name: 'wardrobe', label: 'Szekrény', image: '/furniture/wardrobe.png', previewImage: '/previews/furniture/wardrobe.png', category: 'Hálószoba' },
  { name: 'bed', label: 'Ágy', image: '/furniture/bed.png', previewImage: '/previews/furniture/bed.png', category: 'Hálószoba' },
  { name: 'redbed', label: 'Piros ágy', image: '/furniture/redbed.png', previewImage: '/previews/furniture/redbed.png', category: 'Hálószoba' },
  { name: 'singlebed', label: 'Egyszemélyes ágy', image: '/furniture/singlebed.png', previewImage: '/previews/furniture/singlebed.png', category: 'Hálószoba' },
  { name: 'nightstand', label: 'Éjjeliszekrény', image: '/furniture/nightstand.png', previewImage: '/previews/furniture/nightstand.png', category: 'Hálószoba' },
  { name: 'lamp', label: 'Lámpa', image: '/furniture/lamp.png', previewImage: '/previews/furniture/lamp.png', category: 'Hálószoba' },
  { name: 'dining-table', label: 'Ebédlőasztal', image: '/furniture/dining_table.png', previewImage: '/previews/furniture/dining_table.png', category: 'Konyha' },
  { name: 'large-dining-table', label: 'Nagy ebédlőasztal', image: '/furniture/xl_dining_table.png', previewImage: '/previews/furniture/xl_dining_table.png', category: 'Konyha' },
  { name: 'oven', label: 'Sütő', image: '/furniture/oven.png', previewImage: '/previews/furniture/oven.png', category: 'Konyha' },
  { name: 'microwave', label: 'Mikró', image: '/furniture/microwave.png', previewImage: '/previews/furniture/microwave.png', category: 'Konyha' },
  { name: 'fridge', label: 'Hűtő', image: '/furniture/fridge.png', previewImage: '/previews/furniture/fridge.png', category: 'Konyha' },
  { name: 'kitchen-sink', label: 'Konyhai mosogató', image: '/furniture/kitchen_sink.png', previewImage: '/previews/furniture/kitchen_sink.png', category: 'Konyha' },
  { name: 'counter', label: 'Pult', image: '/furniture/counter.png', previewImage: '/previews/furniture/counter.png', category: 'Konyha' },
  { name: 'round-table', label: 'Kerek asztal', image: '/furniture/round_table.png', previewImage: '/previews/furniture/round_table.png', category: 'Konyha' },
];

export const FLOOR_TYPES: FloorType[] = [
  { name: 'Világos parketta', image: '/floor/floor_light_wood.png', previewImage: '/previews/floor/floor_light_wood.png' },
  { name: 'Sötét parketta', image: '/floor/floor_dark_wood.jpg', previewImage: '/previews/floor/floor_dark_wood.jpg' },
  { name: 'Fehér járólap', image: '/floor/floor_white_tile.png', previewImage: '/previews/floor/floor_white_tile.png' },
  { name: 'Szürke csempe', image: '/floor/floor_grey_tile.png', previewImage: '/previews/floor/floor_grey_tile.png' },
  { name: 'Klasszikus csempe', image: '/floor/floor_classic_tile.jpg', previewImage: '/previews/floor/floor_classic_tile.jpg' },
  { name: 'Szőnyeg padló', image: '/floor/carpet_tile.jpg', previewImage: '/previews/floor/carpet_tile.jpg' },
];

export const RUG_TYPES: RugType[] = [
  { name: 'Lábtörlő', label: 'Lábtörlő', image: '/rug/rug_mat.png', previewImage: '/previews/rug/rug_mat.png' },
  { name: 'Kerek színes szőnyeg', label: 'Kerek színes szőnyeg', image: '/rug/rug_round_colorful.png', previewImage: '/previews/rug/rug_round_colorful.png' },
  { name: 'Modern szürke szőnyeg', label: 'Modern szürke szőnyeg', image: '/rug/rug_modern_grey.png', previewImage: '/previews/rug/rug_modern_grey.png' },
  { name: 'Klasszikus perzsa', label: 'Klasszikus perzsa', image: '/rug/rug_persian.png', previewImage: '/previews/rug/rug_persian.png' },
  { name: 'Kék mintás szőnyeg', label: 'Kék mintás szőnyeg', image: '/rug/rug_blue_pattern.png', previewImage: '/previews/rug/rug_blue_pattern.png' },
  { name: 'Zöld shaggy', label: 'Zöld shaggy', image: '/rug/rug_green_shaggy.png', previewImage: '/previews/rug/rug_green_shaggy.png' },
  { name: 'Minimal fehér', label: 'Minimal fehér', image: '/rug/rug_minimal_white.png', previewImage: '/previews/rug/rug_minimal_white.png' },
];

export const ROOM_CATEGORIES = ['Nappali', 'Fürdőszoba', 'Hálószoba', 'Konyha'];
