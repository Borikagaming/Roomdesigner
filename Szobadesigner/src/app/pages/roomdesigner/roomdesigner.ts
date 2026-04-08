import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Canvas, Circle, Control, FabricImage, Point as FabricPoint, Polygon, Rect, controlsUtils, util, } from 'fabric';
import { CanvasPoint, DOOR_WINDOW_ITEMS, FLOOR_TYPES, FURNITURE_ITEMS, FloorType, FurnitureItem, ROOM_CATEGORIES, RUG_TYPES, RugType, SavedRoomLayout, SavedRoomSummary, } 
from './roomdesigner.data';

@Component({
  selector: 'app-roomdesigner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roomdesigner.html',
  styleUrls: ['./roomdesigner.css'],
})
export class RoomdesignerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer') canvasContainer?: ElementRef<HTMLElement>;
  @ViewChild('importFileInput') importFileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('sidebarScroll') sidebarScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('wallEditPanel') wallEditPanel?: ElementRef<HTMLElement>;

  canvas!: Canvas;
  roomPolygon: (Polygon & any) | null = null;
  selectedObject: any = null;
  wallControls: Circle[] = [];
  floorImageObj: any = null;
  rugObjects: any[] = [];

  isEditingWalls = false;
  isHelpOpen = true;
  roomArea = 0;
  draggedItem: FurnitureItem | RugType | null = null;
  currentRoomName = 'Névtelen szoba';

  showSaveDialog = false;
  showImportDialog = false;
  showSavedRoomsDialog = false;
  isSaving = false;
  isImporting = false;
  isLoadingSavedRooms = false;

  exportRoomName = 'Névtelen szoba';
  exportSaveToServer = true;
  exportAlsoDownloadTxt = false;
  importRoomName = '';
  importFileName = '';
  selectedImportFile: File | null = null;
  savedRooms: SavedRoomSummary[] = [];
  loadingSavedRoomId: number | null = null;

  statusMessage = '';
  statusTone: 'success' | 'error' | 'info' = 'info';

  private upperCanvasEl?: HTMLCanvasElement;
  private readonly upperCanvasDragOverHandler = (event: DragEvent) => this.onDragOver(event);
  private readonly upperCanvasDropHandler = (event: DragEvent) => this.onDrop(event);

  readonly doorWindowItems = DOOR_WINDOW_ITEMS;
  readonly furnitureItems = FURNITURE_ITEMS;
  readonly floorTypes = FLOOR_TYPES;

  selectedFloor: FloorType = this.floorTypes[0];
  readonly rugTypes = RUG_TYPES;
  readonly categories = ROOM_CATEGORIES;

  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get canSaveToServer(): boolean {
    return this.hasAuthToken();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      void this.initializeDesigner();
    }, 100);
  }

  private async initializeDesigner(): Promise<void> {
    this.initCanvas();
    this.initRoom();
    await this.loadPendingRoomLayoutFromSession();
  }

  ngOnDestroy(): void {
    if (this.upperCanvasEl) {
      this.upperCanvasEl.removeEventListener('dragover', this.upperCanvasDragOverHandler);
      this.upperCanvasEl.removeEventListener('drop', this.upperCanvasDropHandler);
      this.upperCanvasEl = undefined;
    }

    if (this.canvas) {
      this.canvas.dispose();
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'Delete' && !this.isEditingWalls) {
      this.deleteSelected();
    }
  }

  getFurnitureByCategory(category: string): FurnitureItem[] {
    return this.furnitureItems.filter((item) => item.category === category);
  }

  getSidebarCategoryIcon(category: string): string {
    const normalizedCategory = (category || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');

    switch (normalizedCategory) {
      case 'nappali':
        return 'bi bi-house-heart-fill';
      case 'furdoszoba':
        return 'bi bi-droplet-fill';
      case 'haloszoba':
        return 'bi bi-moon-stars-fill';
      case 'konyha':
        return 'bi bi-cup-hot-fill';
      case 'szonyegek':
        return 'bi bi-grid-3x3-gap-fill';
      case 'padlok':
        return 'bi bi-border-all';
      default:
        return 'bi bi-circle-fill';
    }
  }

  onRugDragStart(event: DragEvent, item: RugType): void {
    if (!this.canDropFurniture()) {
      event.preventDefault();
      return;
    }

    this.draggedItem = item;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text', item.name);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  selectFloor(floor: FloorType): void {
    const resolvedFloor = this.resolveFloorDefinition(floor);
    if (!resolvedFloor) {
      return;
    }

    this.selectedFloor = resolvedFloor;
    void this.setFloor(resolvedFloor);
  }

  getDefaultRoomPoints(): CanvasPoint[] {
    return [
      { x: 480, y: 240 },
      { x: 1080, y: 240 },
      { x: 1080, y: 600 },
      { x: 480, y: 600 },
    ];
  }

  setStatus(message: string, tone: 'success' | 'error' | 'info' = 'info'): void {
    this.statusMessage = message;
    this.statusTone = tone;
  }

  clearStatus(): void {
    this.statusMessage = '';
  }

  private async loadPendingRoomLayoutFromSession(): Promise<void> {
    const rawPendingLayout = sessionStorage.getItem('roomdesignerPendingLayout');
    if (!rawPendingLayout) {
      return;
    }

    sessionStorage.removeItem('roomdesignerPendingLayout');

    try {
      const pendingLayout = JSON.parse(rawPendingLayout);
      const layout = this.parseLayoutData(pendingLayout?.layout);
      const fallbackRoomName =
        (typeof pendingLayout?.roomName === 'string' && pendingLayout.roomName.trim()) ||
        'Névtelen szoba';

      await this.applyImportedLayout(layout, fallbackRoomName);
    } catch (error) {
      console.error('Nem sikerült betölteni a kiválasztott mentést:', error);
      this.setStatus('A kijelölt mentés nem tölthető be.', 'error');
    }
  }

  createRoomPolygon(points: CanvasPoint[]): Polygon & any {
    const polygon = new Polygon(
      points.map((point) => ({ x: Number(point.x), y: Number(point.y) })),
      {
        left: 0,
        top: 0,
        fill: 'rgba(245, 248, 252, 0.9)',
        stroke: '#2c3e50',
        strokeWidth: 8,
        selectable: false,
        evented: false,
        objectCaching: false,
        strokeLineJoin: 'miter',
      } as any,
    ) as Polygon & any;

    polygon.pathOffset = { x: 0, y: 0 };
    polygon.setCoords();
    return polygon;
  }

  private updateRoomSurfaceFill(): void {
    if (!this.roomPolygon) {
      return;
    }

    this.roomPolygon.set({
      fill: this.floorImageObj ? 'rgba(255, 255, 255, 0.04)' : 'rgba(245, 248, 252, 0.58)',
    } as any);
    this.roomPolygon.setCoords();
  }

  initCanvas(): void {
    if (!this.canvasContainer) {
      return;
    }

    const width = this.canvasContainer.nativeElement.clientWidth || 1200;
    const height = this.canvasContainer.nativeElement.clientHeight || 720;

    this.canvas = new Canvas('roomCanvas', {
      width,
      height,
      backgroundColor: 'transparent',
      selection: true,
      selectionKey: ['ctrlKey', 'metaKey', 'shiftKey'],
    });
    this.canvas.on('selection:created', (event: any) => this.onObjectSelected(event));
    this.canvas.on('selection:updated', (event: any) => this.onObjectSelected(event));
    this.canvas.on('selection:cleared', () => this.syncSelectionState());

    this.canvas.on('object:modified', (event: any) => {
      const object = event.target as any;
      if (object?.name === 'door' || object?.name === 'window') {
        const maxWidth = this.getMaxWidthForDoorOrWindow(object);
        const currentWidth = (object.width || 0) * (object.scaleX || 1);
        if (currentWidth > maxWidth) {
          object.set({ width: maxWidth, scaleX: 1 });
        }
        this.snapWallObjectToWall(object);
      }

      this.calculateArea();
      this.cdr.detectChanges();
    });

    this.canvas.on('object:scaling', (event: any) => {
      const object = event.target as any;
      if (object?.name === 'door' || object?.name === 'window') {
        if ((object.scaleX || 1) < 1) {
          object.set({ scaleX: 1 });
        }

        const maxWidth = this.getMaxWidthForDoorOrWindow(object);
        const currentWidth = (object.width || 0) * (object.scaleX || 1);
        if (currentWidth > maxWidth) {
          object.set({ scaleX: maxWidth / (object.width || 1) });
        }

        this.snapWallObjectToWall(object);
      }

      this.canvas.requestRenderAll();
    });

    this.canvas.on('object:moving', (event: any) => {
      const object = event.target as any;
      if (object?.name === 'door' || object?.name === 'window') {
        this.snapWallObjectToWall(object);
      }

      this.canvas.requestRenderAll();
    });

    this.upperCanvasEl = (this.canvas as any).upperCanvasEl as HTMLCanvasElement | undefined;
    if (this.upperCanvasEl) {
      const canvasWrapper = this.upperCanvasEl.parentElement as HTMLElement | null;
      if (canvasWrapper) {
        canvasWrapper.style.position = 'relative';
        canvasWrapper.style.zIndex = '5';
        canvasWrapper.style.pointerEvents = 'auto';
      }

      this.canvas.getElement().style.pointerEvents = 'auto';
      this.canvas.getElement().style.zIndex = '1';
      this.upperCanvasEl.style.pointerEvents = 'auto';
      this.upperCanvasEl.style.zIndex = '2';
      this.upperCanvasEl.addEventListener('dragover', this.upperCanvasDragOverHandler);
      this.upperCanvasEl.addEventListener('drop', this.upperCanvasDropHandler);
    }
  }

  initRoom(): void {
    const defaultPoints = this.getDefaultRoomPoints();
    this.roomPolygon = this.createRoomPolygon(defaultPoints);
    this.updateRoomSurfaceFill();
    this.canvas.add(this.roomPolygon);
    this.canvas.sendObjectToBack(this.roomPolygon);
    this.calculateArea();
  }

  canDropFurniture(): boolean {
    return !this.isEditingWalls;
  }

  onDragStart(event: DragEvent, item: FurnitureItem): void {
    if (!this.canDropFurniture()) {
      event.preventDefault();
      return;
    }

    this.draggedItem = item;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text', item.name);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent): void {
    if (!this.canDropFurniture()) {
      return;
    }

    event.preventDefault();
    if (!this.draggedItem || !this.canvas) {
      return;
    }

    const rect = this.canvas.getElement().getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.addImageToCanvas(this.draggedItem.image, x, y);
    this.draggedItem = null;
  }

  snapWallObjectToWall(object: any): void {
    if (!this.roomPolygon) {
      return;
    }

    const matrix = this.roomPolygon.calcTransformMatrix();
    const transformedPoints = this.roomPolygon.points.map((point: CanvasPoint) =>
      util.transformPoint(new FabricPoint(point.x, point.y), matrix),
    );

    const centerPoint = object.getCenterPoint();
    let closestDistance = Infinity;
    let closestSegment: any = null;
    let wallIndex = -1;

    for (let index = 0; index < transformedPoints.length; index += 1) {
      const current = transformedPoints[index];
      const next = transformedPoints[(index + 1) % transformedPoints.length];
      const wallVector = new FabricPoint(next.x - current.x, next.y - current.y);
      const pointVector = new FabricPoint(centerPoint.x - current.x, centerPoint.y - current.y);
      const wallLengthSquared = wallVector.x * wallVector.x + wallVector.y * wallVector.y;
      const projectedRatio =
        wallLengthSquared === 0
          ? 0
          : Math.max(
              0,
              Math.min(
                1,
                (wallVector.x * pointVector.x + wallVector.y * pointVector.y) / wallLengthSquared,
              ),
            );

      const closestPoint = new FabricPoint(
        current.x + wallVector.x * projectedRatio,
        current.y + wallVector.y * projectedRatio,
      );

      const distance = Math.sqrt(
        (closestPoint.x - centerPoint.x) ** 2 + (closestPoint.y - centerPoint.y) ** 2,
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestSegment = { a: current, b: next, t: projectedRatio };
        wallIndex = index;
      }
    }

    if (!closestSegment) {
      return;
    }

    const wallLength = Math.sqrt(
      (closestSegment.b.x - closestSegment.a.x) ** 2 +
        (closestSegment.b.y - closestSegment.a.y) ** 2,
    );
    const objectWidth = (object.width || 0) * (object.scaleX || 1);
    const minRatio = objectWidth / (2 * wallLength);
    const maxRatio = 1 - objectWidth / (2 * wallLength);
    let ratio = closestSegment.t;

    if (minRatio <= maxRatio) {
      ratio = Math.max(minRatio, Math.min(maxRatio, closestSegment.t));
    } else {
      ratio = 0.5;
    }

    const snappedPoint = new FabricPoint(
      closestSegment.a.x + (closestSegment.b.x - closestSegment.a.x) * ratio,
      closestSegment.a.y + (closestSegment.b.y - closestSegment.a.y) * ratio,
    );
    const angle =
      (Math.atan2(
        closestSegment.b.y - closestSegment.a.y,
        closestSegment.b.x - closestSegment.a.x,
      ) *
        180) /
      Math.PI;

    object.set({ left: snappedPoint.x, top: snappedPoint.y, angle });
    object.setCoords();
    object.wallIndex = wallIndex;
    object.wallPositionRatio = ratio;
  }

  updateDoorsAndWindowsOnWalls(): void {
    if (!this.roomPolygon?.points) {
      return;
    }

    const matrix = this.roomPolygon.calcTransformMatrix();
    const points = this.roomPolygon.points.map((point: CanvasPoint) =>
      util.transformPoint(new FabricPoint(point.x, point.y), matrix),
    );

    this.canvas
      .getObjects()
      .filter((object: any) => this.isWallOpeningObject(object))
      .forEach((object: any) => {
        const wallIndex = Number(object.wallIndex);
        const storedRatio = Number(object.wallPositionRatio);

        if (
          !Number.isInteger(wallIndex) ||
          wallIndex < 0 ||
          wallIndex >= points.length ||
          !Number.isFinite(storedRatio)
        ) {
          this.snapWallObjectToWall(object);
          return;
        }

        const start = points[wallIndex];
        const end = points[(wallIndex + 1) % points.length];
        const wallLength = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
        const objectWidth = (object.width || 0) * (object.scaleX || 1);
        let ratio = Math.max(0, Math.min(1, storedRatio));

        if (wallLength > 0) {
          const minRatio = objectWidth / (2 * wallLength);
          const maxRatio = 1 - objectWidth / (2 * wallLength);
          ratio = minRatio <= maxRatio ? Math.max(minRatio, Math.min(maxRatio, ratio)) : 0.5;
        }

        const left = start.x + (end.x - start.x) * ratio;
        const top = start.y + (end.y - start.y) * ratio;
        const angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;

        object.set({ left, top, angle });
        object.setCoords();
        object.wallIndex = wallIndex;
        object.wallPositionRatio = ratio;
      });
  }

  getRoomBounds(): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    roomWidth: number;
    roomHeight: number;
  } {
    const minX = Math.min(...this.roomPolygon!.points.map((point: CanvasPoint) => point.x));
    const minY = Math.min(...this.roomPolygon!.points.map((point: CanvasPoint) => point.y));
    const maxX = Math.max(...this.roomPolygon!.points.map((point: CanvasPoint) => point.x));
    const maxY = Math.max(...this.roomPolygon!.points.map((point: CanvasPoint) => point.y));

    return {
      minX,
      minY,
      maxX,
      maxY,
      roomWidth: Math.abs(maxX - minX),
      roomHeight: Math.abs(maxY - minY),
    };
  }

  loadImageElement(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Image loading failed: ${src}`));
      image.src = src;
    });
  }
  async createFloorImage(floor: FloorType): Promise<any> {
    const { minX, minY, roomWidth, roomHeight } = this.getRoomBounds();
    const canvasElement = document.createElement('canvas');
    const tileSize = 64;

    canvasElement.width = Math.max(1, Math.round(roomWidth));
    canvasElement.height = Math.max(1, Math.round(roomHeight));

    const context = canvasElement.getContext('2d');
    if (!context) {
      throw new Error('Floor canvas context could not be created.');
    }

    context.beginPath();
    const clippedPoints = this.roomPolygon!.points.map((point: CanvasPoint) => ({
      x: point.x - minX,
      y: point.y - minY,
    }));

    if (clippedPoints.length > 0) {
      context.moveTo(clippedPoints[0].x, clippedPoints[0].y);
      for (let index = 1; index < clippedPoints.length; index += 1) {
        context.lineTo(clippedPoints[index].x, clippedPoints[index].y);
      }
      context.closePath();
      context.clip();
    }

    const tileImage = await this.loadImageElement(floor.image);
    for (let y = 0; y < roomHeight; y += tileSize) {
      for (let x = 0; x < roomWidth; x += tileSize) {
        context.drawImage(tileImage, x, y, tileSize, tileSize);
      }
    }

    const dataUrl = canvasElement.toDataURL();
    const floorImage = await FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' });
    floorImage.set({
      left: minX,
      top: minY,
      originX: 'left',
      originY: 'top',
      selectable: false,
      evented: false,
      width: roomWidth,
      height: roomHeight,
    } as any);

    const floorImageWithMeta = floorImage as any;
    floorImageWithMeta.isFloor = true;
    floorImageWithMeta.floorTextureSrc = floor.image;
    floorImageWithMeta.floorName = floor.name || '';
    return floorImageWithMeta;
  }

  async setFloor(floor: FloorType): Promise<void> {
    const resolvedFloor = this.resolveFloorDefinition(floor);
    if (!resolvedFloor) {
      return;
    }

    this.selectedFloor = resolvedFloor;

    if (this.floorImageObj) {
      this.canvas.remove(this.floorImageObj);
      this.floorImageObj = null;
    }

    if (!this.roomPolygon?.points?.length) {
      console.error('No room polygon defined');
      return;
    }

    try {
      const floorImage = await this.createFloorImage(resolvedFloor);
      this.floorImageObj = floorImage;
      this.updateRoomSurfaceFill();
      this.canvas.add(floorImage);
      this.reorderLayers();
      this.canvas.renderAll();
    } catch (error) {
      console.error('Error creating tiled floor:', error);
      this.setStatus('A padló betöltése nem sikerült.', 'error');
    }
  }

  regenerateFloor(): void {
    if (!this.selectedFloor || !this.roomPolygon) {
      return;
    }

    void (async () => {
      try {
        const floorImage = await this.createFloorImage(this.selectedFloor);
        const existingFloor = this.canvas.getObjects().find((object: any) => object.isFloor);
        if (existingFloor) {
          this.canvas.remove(existingFloor);
        }

        this.floorImageObj = floorImage;
        this.updateRoomSurfaceFill();
        this.canvas.add(floorImage);
        this.reorderLayers();
        this.canvas.requestRenderAll();
      } catch (error) {
        console.error('Error regenerating floor:', error);
      }
    })();
  }

  resolveFloorDefinition(floor: FloorType | null | undefined): FloorType | null {
    if (!floor?.image) {
      return null;
    }

    return (
      this.floorTypes.find(
        (candidate) => candidate.image === floor.image || (!!floor.name && candidate.name === floor.name),
      ) || {
        name: floor.name || 'Mentett padló',
        image: floor.image,
      }
    );
  }

  detectAndMarkImages(): void {
    const objects = this.canvas.getObjects();
    this.rugObjects = [];

    objects.forEach((object: any) => {
      try {
        if (this.getNormalizedObjectType(object) === 'image') {
          const floorTextureSrc = object.floorTextureSrc;
          const src =
            typeof object.getSrc === 'function'
              ? object.getSrc()
              : object.getElement?.()?.src ?? object.getElement?.().src ?? null;

          if (floorTextureSrc && typeof floorTextureSrc === 'string') {
            object.isFloor = true;
            this.floorImageObj = object;
          } else if (typeof src === 'string') {
            const normalizedSrc = src.toLowerCase();
            if (normalizedSrc.includes('/floor/')) {
              object.isFloor = true;
              this.floorImageObj = object;
            } else if (normalizedSrc.includes('/rug/')) {
              object.isRug = true;
              if (!this.rugObjects.includes(object)) {
                this.rugObjects.push(object);
              }
            } else if (
              normalizedSrc.includes('/furniture/') ||
              /(sofa|chair|table|desk|bed|wardrobe|cabinet|shelf|oven|sink|toilet|bathtub)/i.test(
                normalizedSrc,
              )
            ) {
              object.isFurniture = true;
            }
          }
        }

        if (
          this.getNormalizedObjectType(object) === 'rect' &&
          !object.isFloor &&
          !object.isRug &&
          (object.name === 'door' || object.name === 'window')
        ) {
          object.isFurniture = true;
        }
      } catch {
        // Importált, részben hibás objektumoknál csendben továbblépünk.
      }

      if (this.getNormalizedObjectType(object) === 'image' && !object.isFloor && (object.isFurniture || object.isRug)) {
        this.configureFurnitureObjectControls(object);
      }
    });
  }

  private configureFurnitureObjectControls(object: any): void {
    if (!object || this.getNormalizedObjectType(object) !== 'image') {
      return;
    }

    object.set({
      cornerColor: '#3498db',
      borderColor: '#2980b9',
      cornerStyle: 'circle',
      transparentCorners: false,
      cornerSize: 12,
      padding: 2,
    } as any);
    object.setCoords();
  }

  reorderLayers(): void {
    if (!this.canvas) {
      return;
    }

    const objects = [...this.canvas.getObjects()];
    if (!this.floorImageObj) {
      this.floorImageObj = objects.find((object: any) => object.isFloor) ?? null;
    }

    const floorObject = this.floorImageObj;
    const roomPolygon = this.roomPolygon;
    const rugs = objects.filter((object: any) => object.isRug);
    const furniture = objects.filter(
      (object: any) => object.isFurniture && object !== roomPolygon && !object.isRug && !object.isFloor,
    );
    const wallControls = this.wallControls;
    const remainingObjects = objects.filter(
      (object: any) =>
        object !== floorObject &&
        object !== roomPolygon &&
        !object.isRug &&
        !object.isFurniture &&
        !wallControls.includes(object),
    );

    const orderedObjects: any[] = [];
    if (floorObject) {
      orderedObjects.push(floorObject);
    }
    if (roomPolygon) {
      orderedObjects.push(roomPolygon);
    }
    rugs.forEach((object) => orderedObjects.push(object));
    furniture.forEach((object) => orderedObjects.push(object));
    remainingObjects.forEach((object) => orderedObjects.push(object));
    wallControls.forEach((object) => orderedObjects.push(object));

    orderedObjects.forEach((object, index) => {
      if (this.canvas.getObjects().indexOf(object) !== index) {
        this.canvas.moveObjectTo(object, index);
      }
    });

    this.canvas.requestRenderAll();
  }

  private configureWallOpeningObject(object: any, kind: 'door' | 'window'): void {
    const defaults =
      kind === 'door'
        ? { width: 100, height: 12, fill: '#8B5A2B' }
        : { width: 80, height: 10, fill: '#87CEEB' };

    object.set({
      width: Math.max(10, Number(object.width ?? defaults.width)),
      height: Math.max(4, Number(object.height ?? defaults.height)),
      fill: defaults.fill,
      originX: 'center',
      originY: 'center',
      hasControls: true,
      hasBorders: true,
      lockScalingY: true,
      lockRotation: true,
      lockSkewingX: true,
      lockSkewingY: true,
    });

    object.name = kind;
    object.openingKind = kind;
    object.isFurniture = true;
    object.controls = {
      ml: new Control({
        x: -0.5,
        y: 0,
        offsetX: 0,
        offsetY: 0,
        cursorStyle: 'ew-resize',
        actionHandler: controlsUtils.scalingX,
        actionName: 'scaling',
      }),
      mr: new Control({
        x: 0.5,
        y: 0,
        offsetX: 0,
        offsetY: 0,
        cursorStyle: 'ew-resize',
        actionHandler: controlsUtils.scalingX,
        actionName: 'scaling',
      }),
    };
  }

  createWallOpeningRect(kind: 'door' | 'window', width?: number, height?: number): Rect & any {
    const defaults =
      kind === 'door'
        ? { width: 100, height: 12, fill: '#8B5A2B' }
        : { width: 80, height: 10, fill: '#87CEEB' };

    const rect = new Rect({
      width: Math.max(10, width ?? defaults.width),
      height: Math.max(4, height ?? defaults.height),
      fill: defaults.fill,
      originX: 'center',
      originY: 'center',
      hasControls: true,
      hasBorders: true,
      lockScalingY: true,
      lockRotation: true,
      lockSkewingX: true,
      lockSkewingY: true,
    } as any) as Rect & any;

    this.configureWallOpeningObject(rect, kind);
    return rect;
  }

  bindWallOpeningObject(object: any): void {
    object.off('moving');
    object.off('modified');
    object.on('moving', () => this.snapWallObjectToWall(object));
    object.on('modified', () => this.snapWallObjectToWall(object));
  }

  private resolveWallOpeningKind(object: any): 'door' | 'window' {
    if (object?.openingKind === 'window' || object?.name === 'window') {
      return 'window';
    }

    if (object?.openingKind === 'door' || object?.name === 'door') {
      return 'door';
    }

    const fill = typeof object?.fill === 'string' ? object.fill.toLowerCase() : '';
    if (fill.includes('87ceeb') || fill.includes('135, 206, 235') || fill.includes('135,206,235')) {
      return 'window';
    }

    const width = Number(object?.width ?? 0);
    const height = Number(object?.height ?? 0);
    if ((width > 0 && width <= 90) || (height > 0 && height <= 10)) {
      return 'window';
    }

    return 'door';
  }

  addImageToCanvas(imagePath: string, x: number, y: number): void {
    if (imagePath.includes('door')) {
      const door = this.createWallOpeningRect('door');
      door.set({ left: x, top: y });
      this.snapWallObjectToWall(door);
      this.bindWallOpeningObject(door);
      this.canvas.add(door);
      this.canvas.setActiveObject(door);
      this.reorderLayers();
      this.canvas.renderAll();
      return;
    }

    if (imagePath.includes('window')) {
      const windowObject = this.createWallOpeningRect('window');
      windowObject.set({ left: x, top: y });
      this.snapWallObjectToWall(windowObject);
      this.bindWallOpeningObject(windowObject);
      this.canvas.add(windowObject);
      this.canvas.setActiveObject(windowObject);
      this.reorderLayers();
      this.canvas.renderAll();
      return;
    }

    FabricImage.fromURL(imagePath, { crossOrigin: 'anonymous' })
      .then((image) => {
        const scale = 110 / Math.max(image.height || 1, 1);
        image.set({
          left: x,
          top: y,
          scaleX: scale,
          scaleY: scale,
          originX: 'center',
          originY: 'center',
        } as any);
        this.configureFurnitureObjectControls(image);

        this.canvas.add(image);

        const normalizedPath = imagePath.toLowerCase();
        if (normalizedPath.includes('/rug/')) {
          (image as any).isRug = true;
          if (!this.rugObjects.includes(image)) {
            this.rugObjects.push(image);
          }
        } else if (
          normalizedPath.includes('/furniture/') ||
          /(sofa|chair|table|desk|bed|wardrobe|cabinet|shelf|oven|sink|toilet|bathtub)/i.test(normalizedPath)
        ) {
          (image as any).isFurniture = true;
        }

        this.canvas.setActiveObject(image);
        this.reorderLayers();
        this.canvas.renderAll();
      })
      .catch((error) => console.error('Error adding image:', error));
  }

  updateRoomShape(): void {
    if (!this.roomPolygon || this.wallControls.length === 0) {
      return;
    }

    const gridSize = 20;
    const nextPoints = this.wallControls.map((control) => {
      const snappedLeft = Math.round((control.left || 0) / gridSize) * gridSize;
      const snappedTop = Math.round((control.top || 0) / gridSize) * gridSize;
      control.set({ left: snappedLeft, top: snappedTop });
      return { x: snappedLeft, y: snappedTop };
    });

    this.roomPolygon.set({ left: 0, top: 0, points: nextPoints, angle: 0 } as any);
    this.roomPolygon.pathOffset = { x: 0, y: 0 };
    this.roomPolygon.setCoords();

    this.calculateArea();
    if (this.floorImageObj) {
      this.regenerateFloor();
    }
    this.updateDoorsAndWindowsOnWalls();
    this.canvas.requestRenderAll();
  }

  toggleWallEdit(): void {
    if (!this.roomPolygon) {
      return;
    }

    this.isEditingWalls = !this.isEditingWalls;
    if (this.isEditingWalls) {
      this.selectedObject = null;
      this.canvas.discardActiveObject();
      this.roomPolygon.set('stroke', '#ff6b00');
      this.createWallControls();
      this.keepWallEditPanelVisible();
    } else {
      this.removeWallControls();
      this.roomPolygon.set('stroke', '#2c3e50');
    }

    this.canvas.requestRenderAll();
    this.cdr.detectChanges();
  }

  private keepWallEditPanelVisible(): void {
    requestAnimationFrame(() => {
      const scrollContainer = this.sidebarScroll?.nativeElement;
      const panel = this.wallEditPanel?.nativeElement;
      if (!scrollContainer || !panel) {
        return;
      }

      const targetTop = Math.max(0, panel.offsetTop - 10);
      scrollContainer.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      });
    });
  }

  createWallControls(): void {
    if (!this.roomPolygon?.points) {
      return;
    }

    this.roomPolygon.setCoords();
    const matrix = this.roomPolygon.calcTransformMatrix();
    this.removeWallControls();

    this.roomPolygon.points.forEach((point: CanvasPoint, index: number) => {
      const transformedPoint = util.transformPoint(new FabricPoint(point.x, point.y), matrix);
      const control = new Circle({
        left: transformedPoint.x,
        top: transformedPoint.y,
        radius: 8,
        fill: '#ff6b00',
        stroke: 'white',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        hasControls: false,
        hasBorders: false,
        selectable: true,
        evented: true,
        name: 'wallControl',
        pointIndex: index,
      } as any);

      control.on('moving', () => this.updateRoomShape());
      this.wallControls.push(control);
      this.canvas.add(control);
    });

    this.wallControls.forEach((control) => this.canvas.bringObjectToFront(control));
    this.canvas.renderAll();
  }

  removeWallControls(): void {
    this.wallControls.forEach((control) => this.canvas.remove(control));
    this.wallControls = [];
  }

  private isEditableDesignObject(object: any): boolean {
    return !!object && object !== this.roomPolygon && !object.name?.startsWith('wallControl');
  }

  private getSelectedCanvasObjects(): any[] {
    return this.canvas.getActiveObjects().filter((object: any) => this.isEditableDesignObject(object));
  }

  private syncSelectionState(): void {
    const activeObjects = this.getSelectedCanvasObjects();
    this.selectedObject = activeObjects.length === 1 ? activeObjects[0] : null;
    this.cdr.detectChanges();
  }

  onObjectSelected(event: any): void {
    if (this.isEditingWalls) {
      this.selectedObject = null;
      this.cdr.detectChanges();
      return;
    }

    if (!event?.selected?.length && !this.canvas.getActiveObjects().length) {
      this.selectedObject = null;
      this.cdr.detectChanges();
      return;
    }

    this.syncSelectionState();
  }

  getMaxWidthForDoorOrWindow(object?: any): number {
    const target = object || this.selectedObject;
    if (!target || !this.roomPolygon) {
      return 1000;
    }

    const wallIndex = target.wallIndex;
    if (wallIndex === undefined) {
      return 1000;
    }

    const matrix = this.roomPolygon.calcTransformMatrix();
    const points = this.roomPolygon.points.map((point: CanvasPoint) =>
      util.transformPoint(new FabricPoint(point.x, point.y), matrix),
    );
    const start = points[wallIndex];
    const end = points[(wallIndex + 1) % points.length];
    const wallLength = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);

    return Math.max(10, wallLength - 10);
  }

  isDoorOrWindow(): boolean {
    return !!this.selectedObject && (this.selectedObject.name === 'door' || this.selectedObject.name === 'window');
  }

  getObjectWidth(): number {
    if (!this.selectedObject) {
      return 0;
    }

    return Math.round((this.selectedObject.width || 0) * (this.selectedObject.scaleX || 1));
  }

  private refreshSelectedObjectControls(): void {
    if (!this.selectedObject) {
      return;
    }

    this.selectedObject.setCoords();

    const activeObject = this.canvas.getActiveObject() as any;
    if (activeObject === this.selectedObject) {
      activeObject.setCoords();
    }

    this.canvas.requestRenderAll();
  }

  setObjectWidth(width: number): void {
    if (!this.selectedObject || !Number.isFinite(Number(width))) {
      return;
    }

    const normalizedWidth = Math.max(1, Number(width));
    if (this.selectedObject.name === 'door' || this.selectedObject.name === 'window') {
      const maxWidth = this.getMaxWidthForDoorOrWindow(this.selectedObject);
      this.selectedObject.set({ width: Math.min(normalizedWidth, maxWidth), scaleX: 1 });
      this.snapWallObjectToWall(this.selectedObject);
    } else {
      this.selectedObject.scaleToWidth(normalizedWidth);
    }

    this.refreshSelectedObjectControls();
  }

  getObjectHeight(): number {
    if (!this.selectedObject) {
      return 0;
    }

    return Math.round((this.selectedObject.height || 0) * (this.selectedObject.scaleY || 1));
  }

  setObjectHeight(height: number): void {
    if (!this.selectedObject || !Number.isFinite(Number(height))) {
      return;
    }

    if (this.selectedObject.name === 'door' || this.selectedObject.name === 'window') {
      return;
    }

    this.selectedObject.scaleToHeight(Math.max(1, Number(height)));
    this.refreshSelectedObjectControls();
  }

  getObjectRotation(): number {
    return this.selectedObject ? Math.round(this.selectedObject.angle || 0) : 0;
  }

  setObjectRotation(angle: number): void {
    if (!this.selectedObject || !Number.isFinite(Number(angle))) {
      return;
    }

    let normalizedAngle = Math.round(Number(angle)) % 360;
    if (normalizedAngle < 0) {
      normalizedAngle += 360;
    }

    this.selectedObject.set('angle', normalizedAngle);
    this.refreshSelectedObjectControls();
  }

  deleteSelected(): void {
    const activeObjects = this.getSelectedCanvasObjects();
    if (!activeObjects.length) {
      return;
    }

    this.canvas.discardActiveObject();
    activeObjects.forEach((object) => this.canvas.remove(object));
    this.rugObjects = this.rugObjects.filter((object) => !activeObjects.includes(object));
    this.selectedObject = null;
    this.canvas.requestRenderAll();
    this.cdr.detectChanges();
  }

  calculateArea(): void {
    if (!this.roomPolygon?.points) {
      return;
    }

    const left = this.roomPolygon.left || 0;
    const top = this.roomPolygon.top || 0;
    let area = 0;
    const points = this.roomPolygon.points;

    for (let index = 0; index < points.length; index += 1) {
      const nextIndex = (index + 1) % points.length;
      const x1 = points[index].x + left;
      const y1 = points[index].y + top;
      const x2 = points[nextIndex].x + left;
      const y2 = points[nextIndex].y + top;
      area += x1 * y2;
      area -= x2 * y1;
    }

    this.roomArea = Math.abs(area) / 2 / 10000;
  }

  getWallPoints(): CanvasPoint[] {
    if (!this.roomPolygon?.points) {
      return [];
    }

    const left = this.roomPolygon.left || 0;
    const top = this.roomPolygon.top || 0;

    return this.roomPolygon.points.map((point: CanvasPoint) => ({
      x: Number(point.x) + left,
      y: Number(point.y) + top,
    }));
  }

  buildExportLayout(roomName: string): SavedRoomLayout {
    const extraProperties = [
      'name',
      'isFurniture',
      'isFloor',
      'isRug',
      'wallIndex',
      'wallPositionRatio',
      'openingKind',
      'floorTextureSrc',
      'floorName',
    ];

    const layout = (this.canvas as any).toJSON(extraProperties) as SavedRoomLayout;
    layout.version = 2;
    layout.name = roomName;
    layout.wallPoints = this.getWallPoints();
    layout.selectedFloor = this.selectedFloor
      ? { name: this.selectedFloor.name, image: this.selectedFloor.image }
      : null;
    layout.objects = (layout.objects || []).filter(
      (object: any) =>
        !(object.name === 'wallControl' || object.type === 'polygon' || object.type === 'Polygon' || object.isFloor),
    );

    return layout;
  }

  sanitizeFileName(value: string): string {
    return value.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'szoba';
  }

  downloadLayoutTxt(roomName: string, layout: SavedRoomLayout): void {
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.sanitizeFileName(roomName)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private hasAuthToken(): boolean {
    return !!localStorage.getItem('token');
  }

  getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  async openSavedRoomsDialog(): Promise<void> {
    if (!localStorage.getItem('token')) {
      this.setStatus('Csak bejelentkezett felhasználók érhetik el a mentett szobákat.', 'error');
      return;
    }

    this.showSavedRoomsDialog = true;
    await this.fetchSavedRooms(true);
  }

  closeSavedRoomsDialog(): void {
    if (!this.isLoadingSavedRooms && this.loadingSavedRoomId === null) {
      this.showSavedRoomsDialog = false;
    }
  }

  async refreshSavedRooms(): Promise<void> {
    await this.fetchSavedRooms(true);
  }

  async fetchSavedRooms(force = false): Promise<void> {
    if (this.isLoadingSavedRooms || (!force && this.savedRooms.length > 0)) {
      return;
    }

    this.isLoadingSavedRooms = true;

    try {
      const response: any = await firstValueFrom(
        this.http.get('http://127.0.0.1:8000/api/rooms/mine', {
          headers: this.getAuthHeaders(),
        }),
      );

      this.savedRooms = Array.isArray(response?.data)
        ? response.data.map((room: any) => ({
            id: Number(room.id),
            name: typeof room.name === 'string' ? room.name : 'Névtelen szoba',
            created_at: room.created_at ?? null,
            updated_at: room.updated_at ?? null,
          }))
        : [];
    } catch (error: any) {
      this.savedRooms = [];

      if (error?.status === 401) {
        this.showSavedRoomsDialog = false;
        this.setStatus('Csak bejelentkezett felhasználók érhetik el a mentett szobákat.', 'error');
      } else {
        this.setStatus('Nem sikerült lekérni a mentett szobákat.', 'error');
      }

      console.error(error);
    } finally {
      this.isLoadingSavedRooms = false;
    }
  }

  formatSavedRoomDate(value?: string | null): string {
    if (!value) {
      return 'Mentés ideje ismeretlen';
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Mentés ideje ismeretlen';
    }

    return new Intl.DateTimeFormat('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsedDate);
  }

  async loadSavedRoom(room: SavedRoomSummary): Promise<void> {
    if (this.loadingSavedRoomId !== null) {
      return;
    }

    this.loadingSavedRoomId = room.id;

    try {
      const response: any = await firstValueFrom(
        this.http.get(`http://127.0.0.1:8000/api/rooms/mine/${room.id}`, {
          headers: this.getAuthHeaders(),
        }),
      );

      const layoutData = this.extractLayoutDataFromResponse(response);
      if (!layoutData) {
        this.setStatus('A kiválasztott mentéshez nem tartozik betölthető alaprajz.', 'error');
        return;
      }

      const layout = this.parseLayoutData(layoutData);
      await this.applyImportedLayout(layout, this.extractRoomNameFromResponse(response, room.name || 'Névtelen szoba'));
      this.showSavedRoomsDialog = false;
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        this.setStatus('A mentett szoba adatai sérültek, ezért nem tölthető be.', 'error');
      } else if (error?.status === 401) {
        this.showSavedRoomsDialog = false;
        this.setStatus('A mentett szobák betöltéséhez be kell jelentkezni.', 'error');
      } else if (error?.status === 404) {
        this.setStatus('A kiválasztott mentett szoba már nem található.', 'error');
        await this.fetchSavedRooms(true);
      } else {
        this.setStatus('Hiba történt a mentett szoba betöltése közben.', 'error');
      }

      console.error(error);
    } finally {
      this.loadingSavedRoomId = null;
    }
  }

  saveRoom(): void {
    this.exportRoomName = this.currentRoomName;
    this.exportSaveToServer = this.canSaveToServer;
    this.exportAlsoDownloadTxt = !this.canSaveToServer;
    this.showSaveDialog = true;
  }

  closeSaveDialog(): void {
    if (!this.isSaving) {
      this.showSaveDialog = false;
    }
  }

  async confirmSaveRoom(): Promise<void> {
    const roomName = (this.exportRoomName || this.currentRoomName || 'Névtelen szoba').trim() || 'Névtelen szoba';
    const requestedServerSave = this.exportSaveToServer;
    const saveToServer = requestedServerSave && this.canSaveToServer;

    if (requestedServerSave && !saveToServer && !this.exportAlsoDownloadTxt) {
      this.exportSaveToServer = false;
      this.setStatus('Szerveres mentéshez be kell jelentkezni, vagy válaszd a TXT exportot.', 'error');
      return;
    }

    if (!saveToServer && !this.exportAlsoDownloadTxt) {
      this.setStatus('Válassz legalább egy mentési módot.', 'info');
      return;
    }

    this.isSaving = true;
    const layout = this.buildExportLayout(roomName);

    try {
      if (this.exportAlsoDownloadTxt) {
        this.downloadLayoutTxt(roomName, layout);
      }

      if (saveToServer) {
        await firstValueFrom(
          this.http.post(
            'http://127.0.0.1:8000/api/rooms/save',
            { name: roomName, layout_data: layout },
            { headers: this.getAuthHeaders() },
          ),
        );
      }

      this.currentRoomName = roomName;
      if (saveToServer) {
        await this.fetchSavedRooms(true);
      }
      this.showSaveDialog = false;

      if (saveToServer && this.exportAlsoDownloadTxt) {
        this.setStatus('A szoba elmentve a szerverre, és a TXT fájl is elkészült.', 'success');
      } else if (saveToServer) {
        this.setStatus('A szoba sikeresen elmentve.', 'success');
      } else if (requestedServerSave && this.exportAlsoDownloadTxt) {
        this.setStatus('Bejelentkezés nélkül a terv csak TXT fájlként lett elmentve.', 'success');
      } else {
        this.setStatus('A TXT export elkészült.', 'success');
      }
    } catch (error: any) {
      if (error?.status === 401 || error?.error?.message === 'Unauthenticated.') {
        this.setStatus('Csak bejelentkezett felhasználók menthetnek szobát a szerverre.', 'error');
      } else {
        this.setStatus('Hiba történt a mentés közben.', 'error');
      }
      console.error(error);
    } finally {
      this.isSaving = false;
    }
  }

  importRoom(): void {
    this.importRoomName = '';
    this.selectedImportFile = null;
    this.importFileName = '';
    if (this.importFileInput?.nativeElement) {
      this.importFileInput.nativeElement.value = '';
    }
    this.showImportDialog = true;
  }

  closeImportDialog(): void {
    if (!this.isImporting) {
      this.showImportDialog = false;
    }
  }

  triggerImportFilePicker(): void {
    this.importFileInput?.nativeElement.click();
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] || null;
    this.selectedImportFile = file;
    this.importFileName = file?.name || '';
  }

  clearImportFile(): void {
    this.selectedImportFile = null;
    this.importFileName = '';
    if (this.importFileInput?.nativeElement) {
      this.importFileInput.nativeElement.value = '';
    }
  }
  extractLayoutDataFromResponse(response: any): unknown {
    return response?.layout_data || response?.data?.layout_data || response?.room?.layout_data;
  }

  extractRoomNameFromResponse(response: any, fallback = 'Névtelen szoba'): string {
    return response?.name || response?.data?.name || response?.room?.name || fallback;
  }

  parseLayoutData(data: unknown): SavedRoomLayout {
    return typeof data === 'string' ? JSON.parse(data) : (data as SavedRoomLayout);
  }

  extractSavedWallPoints(layout: SavedRoomLayout): CanvasPoint[] | null {
    if (Array.isArray(layout.wallPoints) && layout.wallPoints.length >= 3) {
      return layout.wallPoints.map((point) => ({ x: Number(point.x), y: Number(point.y) }));
    }

    const polygonObject = (layout.objects || []).find((object: any) => object.type === 'polygon' || object.type === 'Polygon');
    if (polygonObject?.points?.length >= 3) {
      const left = Number(polygonObject.left || 0);
      const top = Number(polygonObject.top || 0);
      return polygonObject.points.map((point: any) => ({
        x: Number(point.x) + left,
        y: Number(point.y) + top,
      }));
    }

    return null;
  }

  extractSavedFloor(layout: SavedRoomLayout): FloorType | null {
    if (layout.selectedFloor?.image) {
      return layout.selectedFloor;
    }

    const floorObject = (layout.objects || []).find((object: any) => object.isFloor || object.floorTextureSrc);
    const textureSrc = floorObject?.floorTextureSrc;
    if (typeof textureSrc === 'string' && textureSrc.toLowerCase().includes('/floor/')) {
      return { name: floorObject?.floorName, image: textureSrc };
    }

    const src = floorObject?.src;
    if (typeof src === 'string' && src.toLowerCase().includes('/floor/')) {
      return { name: floorObject?.floorName, image: src };
    }

    if (typeof floorObject?.floorName === 'string' && floorObject.floorName.trim()) {
      const resolvedFloor = this.floorTypes.find((floor) => floor.name === floorObject.floorName.trim());
      if (resolvedFloor) {
        return resolvedFloor;
      }
    }

    return null;
  }

  hasLegacyFloorSnapshot(layout: SavedRoomLayout): boolean {
    return (layout.objects || []).some(
      (object: any) => object.isFloor && typeof object.src === 'string' && object.src.startsWith('data:image/'),
    );
  }

  getNormalizedObjectType(object: any): string {
    return typeof object?.type === 'string' ? object.type.toLowerCase() : '';
  }

  isWallOpeningObject(object: any): boolean {
    if (!object) {
      return false;
    }

    if (
      object.name === 'door' ||
      object.name === 'window' ||
      object.openingKind === 'door' ||
      object.openingKind === 'window'
    ) {
      return true;
    }

    return this.getNormalizedObjectType(object) === 'rect' && object.name !== 'wallControl' && !object.isFloor && !object.isRug;
  }

  isLegacyFloorLikeSerializedObject(object: any): boolean {
    if (!object || this.getNormalizedObjectType(object) !== 'image' || object.floorTextureSrc) {
      return false;
    }

    if (object.isFloor) {
      return true;
    }

    const src = typeof object.src === 'string' ? object.src.toLowerCase() : '';
    return src.includes('/floor/') || (!!src && src.startsWith('data:image/'));
  }

  isLegacyFloorLikeCanvasObject(object: any): boolean {
    if (!object || this.getNormalizedObjectType(object) !== 'image' || object.floorTextureSrc) {
      return false;
    }

    const srcCandidate =
      typeof object.getSrc === 'function'
        ? object.getSrc()
        : object.getElement?.()?.src ?? object.getElement?.().src ?? '';
    const src = typeof srcCandidate === 'string' ? srcCandidate.toLowerCase() : '';

    return object.isFloor || src.includes('/floor/') || (!!src && src.startsWith('data:image/'));
  }

  buildImportCanvasJson(layout: SavedRoomLayout): SavedRoomLayout {
    return {
      ...layout,
      objects: (layout.objects || []).filter(
        (object: any) =>
          !(
            object.name === 'wallControl' ||
            object.type === 'polygon' ||
            object.type === 'Polygon' ||
            this.isLegacyFloorLikeSerializedObject(object)
          ),
      ),
    };
  }

  async loadCanvasFromJson(layout: SavedRoomLayout): Promise<void> {
    await this.canvas.loadFromJSON(layout as any);
  }

  bindImportedObjects(): void {
    this.canvas.getObjects().forEach((object: any) => {
      if (this.isWallOpeningObject(object)) {
        const kind = this.resolveWallOpeningKind(object);
        this.configureWallOpeningObject(object, kind);
        this.bindWallOpeningObject(object);
      }
    });
  }

  removeLegacyImportedFloorArtifacts(): void {
    this.canvas.getObjects().forEach((object: any) => {
      if (this.isLegacyFloorLikeCanvasObject(object)) {
        this.canvas.remove(object);
      }
    });
  }

  snapImportedWallObjects(): void {
    this.canvas.getObjects().forEach((object: any) => {
      if (this.isWallOpeningObject(object)) {
        this.snapWallObjectToWall(object);
      }
    });
  }

  async applyImportedLayout(layout: SavedRoomLayout, fallbackRoomName: string): Promise<void> {
    const savedPoints = this.extractSavedWallPoints(layout);
    const savedFloor = this.extractSavedFloor(layout);
    const hadLegacyFloorSnapshot = this.hasLegacyFloorSnapshot(layout);
    const cleanLayout = this.buildImportCanvasJson(layout);

    this.canvas.clear();
    this.wallControls = [];
    this.floorImageObj = null;
    this.roomPolygon = null;
    this.rugObjects = [];
    this.selectedObject = null;
    this.isEditingWalls = false;

    await this.loadCanvasFromJson(cleanLayout);

    this.roomPolygon = this.createRoomPolygon(
      savedPoints && savedPoints.length >= 3 ? savedPoints : this.getDefaultRoomPoints(),
    );
    this.updateRoomSurfaceFill();
    this.canvas.add(this.roomPolygon);
    this.removeLegacyImportedFloorArtifacts();
    this.bindImportedObjects();
    this.snapImportedWallObjects();
    this.updateDoorsAndWindowsOnWalls();
    this.detectAndMarkImages();

    if (savedFloor) {
      await this.setFloor(savedFloor);
    } else {
      this.floorImageObj = null;
      this.updateRoomSurfaceFill();
      this.reorderLayers();
      this.canvas.requestRenderAll();
    }

    this.calculateArea();
    this.currentRoomName = (layout.name || fallbackRoomName || 'Névtelen szoba').trim() || 'Névtelen szoba';
    this.showImportDialog = false;

    if (!savedPoints || savedPoints.length < 3) {
      this.setStatus('A mentésben nem volt teljes faladat, ezért alap falakkal töltöttem be.', 'info');
    } else if (!savedFloor && hadLegacyFloorSnapshot) {
      this.setStatus(
        'A szoba betöltve. A régi mentés padlóképe nem volt pontosan visszaállítható, ezért a falakat padló nélkül töltöttem be.',
        'info',
      );
    } else {
      this.setStatus('A szoba sikeresen betöltve.', 'success');
    }
  }

  async confirmImportRoom(): Promise<void> {
    const trimmedRoomName = this.importRoomName.trim();
    if (!this.selectedImportFile && !trimmedRoomName) {
      this.setStatus('Adj meg egy szobanevet, vagy válassz egy TXT fájlt.', 'info');
      return;
    }

    this.isImporting = true;
    try {
      if (this.selectedImportFile) {
        const fileContent = await this.selectedImportFile.text();
        const layout = this.parseLayoutData(fileContent);
        const fallbackRoomName = layout.name || this.selectedImportFile.name.replace(/\.[^.]+$/, '');
        await this.applyImportedLayout(layout, fallbackRoomName);
        return;
      }

      const response: any = await firstValueFrom(
        this.http.get('http://127.0.0.1:8000/api/rooms/find/by-name', {
          params: { name: trimmedRoomName },
        }),
      );

      const layoutData = this.extractLayoutDataFromResponse(response);
      if (!layoutData) {
        this.setStatus('A megadott szobához nem tartozik mentett alaprajz.', 'error');
        return;
      }

      const layout = this.parseLayoutData(layoutData);
      await this.applyImportedLayout(layout, this.extractRoomNameFromResponse(response, trimmedRoomName));
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        this.setStatus('A kiválasztott fájl nem érvényes JSON tartalmú.', 'error');
      } else if (error?.status === 404) {
        this.setStatus('Nem található ilyen nevű szoba.', 'error');
      } else {
        this.setStatus('Hiba történt az importálás közben.', 'error');
      }
      console.error(error);
    } finally {
      this.isImporting = false;
    }
  }

  saveAsPng(): void {
    if (!this.canvas) {
      return;
    }

    const previousBackground = this.canvas.backgroundColor;
    this.canvas.backgroundColor = '#e0e0e0';
    this.canvas.renderAll();

    const dataUrl = this.canvas.toDataURL({ format: 'png', multiplier: 2 });

    this.canvas.backgroundColor = previousBackground;
    this.canvas.renderAll();

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${this.sanitizeFileName(this.currentRoomName)}.png`;
    link.click();
  }
}
