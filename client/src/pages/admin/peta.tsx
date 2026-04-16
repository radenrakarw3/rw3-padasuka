// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  AlertTriangle,
  Camera,
  Grip,
  House,
  Landmark,
  Map as MapIcon,
  MapPin,
  Pencil,
  Save,
  Trash2,
  Waves,
  Wifi,
} from "lucide-react";

import { apiRequest, readJsonSafely } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  DenahAssetFeature,
  DenahAssetType,
  DenahBuildingType,
  DenahHazardFeature,
  DenahHazardSeverity,
  DenahHazardType,
  DenahHouseFeature,
  DenahLatLng,
  DenahLineCondition,
  DenahLineFeature,
  DenahLineType,
  DenahWilayahData,
} from "@shared/schema";

type MapPayload = {
  nama: string;
  data: DenahWilayahData;
};

type KkOption = {
  id: number;
  nomorKk: string;
  alamat: string;
  rt: number;
  kepalaKeluarga: string | null;
  nomorWhatsapp: string | null;
};

type EditorResponse = {
  map: MapPayload;
  kkOptions: KkOption[];
};

type EditorMode =
  | "idle"
  | "create-house"
  | "create-asset"
  | "create-line"
  | "create-hazard"
  | "edit"
  | "delete";

type SelectedFeature =
  | { kind: "house"; id: string }
  | { kind: "asset"; id: string }
  | { kind: "line"; id: string }
  | { kind: "hazard"; id: string }
  | null;

const DEFAULT_CENTER: DenahLatLng = { lat: -6.8736, lng: 107.5548 };

const EMPTY_MAP: MapPayload = {
  nama: "Denah RW 03",
  data: {
    meta: {
      version: 2,
      basemap: "osm",
      center: DEFAULT_CENTER,
      zoom: 19,
    },
    houses: [],
    assets: [],
    lines: [],
    hazards: [],
  },
};

const ASSET_OPTIONS: Array<{
  value: DenahAssetType;
  label: string;
  shortLabel: string;
  color: string;
  icon: typeof Landmark;
}> = [
  { value: "pju", label: "PJU", shortLabel: "PJU", color: "#f59e0b", icon: Landmark },
  { value: "pjg", label: "PJG", shortLabel: "PJG", color: "#14b8a6", icon: Grip },
  { value: "pjl", label: "PJL", shortLabel: "PJL", color: "#6366f1", icon: Grip },
  { value: "cctv", label: "CCTV", shortLabel: "CCTV", color: "#dc2626", icon: Camera },
  { value: "tiang_wifi", label: "Tiang WiFi", shortLabel: "WiFi", color: "#2563eb", icon: Wifi },
];

const LINE_OPTIONS: Array<{
  value: DenahLineType;
  label: string;
  color: string;
  icon: typeof Waves;
}> = [
  { value: "sungai", label: "Sungai", color: "#2563eb", icon: Waves },
  { value: "drainase", label: "Drainase", color: "#0f766e", icon: Waves },
  { value: "jalan_batas", label: "Jalan/Batas", color: "#6b7280", icon: MapIcon },
];

const HAZARD_OPTIONS: Array<{
  value: DenahHazardType;
  label: string;
  shortLabel: string;
  color: string;
  icon: typeof AlertTriangle;
}> = [
  { value: "jalan_buruk", label: "Jalan Buruk", shortLabel: "JB", color: "#b91c1c", icon: AlertTriangle },
  { value: "drainase_buruk", label: "Drainase Buruk", shortLabel: "DB", color: "#ea580c", icon: AlertTriangle },
  { value: "titik_bahaya", label: "Titik Bahaya", shortLabel: "TB", color: "#7c3aed", icon: AlertTriangle },
];

const LINE_CONDITION_OPTIONS: Array<{ value: DenahLineCondition; label: string }> = [
  { value: "baik", label: "Baik" },
  { value: "butuh_perhatian", label: "Butuh Perhatian" },
  { value: "rusak", label: "Rusak" },
];

const BUILDING_TYPE_OPTIONS: Array<{
  value: DenahBuildingType;
  label: string;
  shortLabel: string;
  stroke: string;
  fill: string;
}> = [
  { value: "rumah", label: "Rumah", shortLabel: "Rumah", stroke: "#166534", fill: "#22c55e" },
  { value: "usaha", label: "Tempat Usaha", shortLabel: "Usaha", stroke: "#1d4ed8", fill: "#60a5fa" },
  { value: "kost", label: "Kost", shortLabel: "Kost", stroke: "#7c3aed", fill: "#c084fc" },
  { value: "kontrakan", label: "Kontrakan", shortLabel: "Kontrakan", stroke: "#c2410c", fill: "#fb923c" },
];

const HAZARD_SEVERITY_OPTIONS: Array<{ value: DenahHazardSeverity; label: string }> = [
  { value: "rendah", label: "Rendah" },
  { value: "sedang", label: "Sedang" },
  { value: "tinggi", label: "Tinggi" },
];

function getFeatureId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeBadgeIcon(label: string, color: string, selected = false) {
  const size = selected ? 24 : 18;
  const border = selected ? 2 : 1.5;
  const fontSize = selected ? 8.5 : 7;
  const anchor = size / 2;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:9999px;
        background:${color};
        color:#fff;
        border:${border}px solid #ffffff;
        box-shadow:0 6px 14px rgba(15,23,42,0.22);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:${fontSize}px;
        font-weight:700;
        letter-spacing:0.02em;
      ">${label}</div>
    `,
  });
}

const vertexIcon = L.divIcon({
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  html: `
    <div style="
      width:14px;
      height:14px;
      border-radius:9999px;
      background:#ffffff;
      border:3px solid #0f766e;
      box-shadow:0 6px 12px rgba(15,23,42,0.22);
    "></div>
  `,
});

function formatHouseLabel(house: DenahHouseFeature, kkOptions: KkOption[]) {
  const base = house.name?.trim() || getBuildingStyle(house.type || "rumah").label;
  if (!house.kkIds.length) return base;
  const keluarga = house.kkIds
    .map((kkId) => kkOptions.find((item) => item.id === kkId)?.kepalaKeluarga)
    .filter(Boolean)
    .slice(0, 2);
  const suffix = keluarga.length ? ` • ${keluarga.join(", ")}` : "";
  const extra = house.kkIds.length > 2 ? ` +${house.kkIds.length - 2}` : "";
  return `${base} (${house.kkIds.length} KK)${suffix}${extra}`;
}

function formatHouseCompactLabel(house: DenahHouseFeature) {
  const value = house.name?.trim();
  return value || getBuildingStyle(house.type || "rumah").shortLabel;
}

function formatWhatsappNumber(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  if (digits.startsWith("8")) return `0${digits}`;
  return digits;
}

function getBuildingStyle(type: DenahBuildingType) {
  return BUILDING_TYPE_OPTIONS.find((item) => item.value === type) || BUILDING_TYPE_OPTIONS[0];
}

function getHouseLabelMetrics(house: DenahHouseFeature, zoom: number) {
  const points = house.coordinates.map((point) => L.CRS.EPSG3857.latLngToPoint(L.latLng(point.lat, point.lng), zoom));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const shortestSide = Math.min(width, height);
  const fontSize = Math.max(7, Math.min(14, shortestSide * 0.34));
  const paddingX = Math.max(2, Math.min(6, shortestSide * 0.08));
  const paddingY = Math.max(1, Math.min(4, shortestSide * 0.05));
  const maxWidth = Math.max(18, Math.min(88, width - 4));
  const visible = shortestSide >= 14 && width >= 18;

  return {
    fontSize,
    paddingX,
    paddingY,
    maxWidth,
    visible,
  };
}

function MapInteractionLayer({
  onClick,
  onViewportChange,
}: {
  onClick: (point: DenahLatLng) => void;
  onViewportChange: (center: DenahLatLng, zoom: number) => void;
}) {
  const map = useMapEvents({
    click(event) {
      onClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
    moveend() {
      const center = map.getCenter();
      onViewportChange({ lat: center.lat, lng: center.lng }, map.getZoom());
    },
    zoomend() {
      const center = map.getCenter();
      onViewportChange({ lat: center.lat, lng: center.lng }, map.getZoom());
    },
  });

  return null;
}

function FeatureLegend() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Bangunan</p>
        <div className="grid gap-2">
          {BUILDING_TYPE_OPTIONS.map((item) => (
            <LegendRow key={item.value} color={item.fill} label={item.label} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Aset</p>
        <div className="grid gap-2">
          {ASSET_OPTIONS.map((item) => (
            <LegendRow key={item.value} color={item.color} label={item.label} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Garis</p>
        <div className="grid gap-2">
          {LINE_OPTIONS.map((item) => (
            <LegendRow key={item.value} color={item.color} label={item.label} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Bahaya</p>
        <div className="grid gap-2">
          {HAZARD_OPTIONS.map((item) => (
            <LegendRow key={item.value} color={item.color} label={item.label} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

export default function AdminPeta() {
  const { toast } = useToast();
  const [mapPayload, setMapPayload] = useState<MapPayload | null>(null);
  const [mode, setMode] = useState<EditorMode>("idle");
  const [selected, setSelected] = useState<SelectedFeature>(null);
  const [draftCoordinates, setDraftCoordinates] = useState<DenahLatLng[]>([]);
  const [pendingBuildingType, setPendingBuildingType] = useState<DenahBuildingType>("rumah");
  const [pendingAssetType, setPendingAssetType] = useState<DenahAssetType>("pju");
  const [pendingAssetRt, setPendingAssetRt] = useState<string>("all");
  const [pendingLineType, setPendingLineType] = useState<DenahLineType>("sungai");
  const [pendingLineCondition, setPendingLineCondition] = useState<DenahLineCondition>("baik");
  const [pendingHazardType, setPendingHazardType] = useState<DenahHazardType>("jalan_buruk");
  const [pendingHazardSeverity, setPendingHazardSeverity] = useState<DenahHazardSeverity>("sedang");
  const [pendingHazardRt, setPendingHazardRt] = useState<string>("all");
  const [layerVisibility, setLayerVisibility] = useState({
    houses: true,
    assets: true,
    lines: true,
    hazards: true,
  });
  const [panelTab, setPanelTab] = useState<"detail" | "kk" | "layer" | "legend">("layer");
  const [rtFilter, setRtFilter] = useState<string>("all");
  const [dirty, setDirty] = useState(false);
  const [kkSearch, setKkSearch] = useState("");

  const { data, isLoading, error } = useQuery<EditorResponse>({
    queryKey: ["/api/denah-wilayah/editor"],
    queryFn: async () => {
      const response = await fetch("/api/denah-wilayah/editor", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Gagal mengambil data peta");
      }
      return readJsonSafely<EditorResponse>(response);
    },
  });

  useEffect(() => {
    if (data?.map && !mapPayload) {
      setMapPayload(data.map);
    }
  }, [data, mapPayload]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!mapPayload) {
        throw new Error("Data peta belum siap");
      }
      const response = await apiRequest("PUT", "/api/denah-wilayah", mapPayload);
      return readJsonSafely<MapPayload>(response);
    },
    onSuccess: (saved) => {
      setMapPayload(saved);
      setDirty(false);
      toast({ title: "Peta berhasil disimpan" });
    },
    onError: (saveError: unknown) => {
      toast({
        title: "Gagal menyimpan peta",
        description: saveError instanceof Error ? saveError.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const kkOptions = data?.kkOptions || [];

  const rtOptions = useMemo(() => {
    const allRt = new Set<number>();
    kkOptions.forEach((item) => allRt.add(item.rt));
    mapPayload?.data.houses.forEach((item) => item.rt && allRt.add(item.rt));
    mapPayload?.data.assets.forEach((item) => item.rt && allRt.add(item.rt));
    mapPayload?.data.hazards.forEach((item) => item.rt && allRt.add(item.rt));
    return Array.from(allRt).sort((a, b) => a - b);
  }, [kkOptions, mapPayload]);

  const selectedHouse = useMemo(
    () => (selected?.kind === "house" ? mapPayload?.data.houses.find((item) => item.id === selected.id) || null : null),
    [mapPayload, selected],
  );
  const selectedAsset = useMemo(
    () => (selected?.kind === "asset" ? mapPayload?.data.assets.find((item) => item.id === selected.id) || null : null),
    [mapPayload, selected],
  );
  const selectedLine = useMemo(
    () => (selected?.kind === "line" ? mapPayload?.data.lines.find((item) => item.id === selected.id) || null : null),
    [mapPayload, selected],
  );
  const selectedHazard = useMemo(
    () => (selected?.kind === "hazard" ? mapPayload?.data.hazards.find((item) => item.id === selected.id) || null : null),
    [mapPayload, selected],
  );

  useEffect(() => {
    if (selectedHouse) {
      setPanelTab((previous) => (previous === "layer" || previous === "legend" ? "detail" : previous));
      return;
    }

    if (selectedAsset || selectedLine || selectedHazard) {
      setPanelTab("detail");
      return;
    }

    setPanelTab((previous) => (previous === "detail" || previous === "kk" ? "layer" : previous));
  }, [selectedAsset, selectedHazard, selectedHouse, selectedLine]);

  const assignedKkMap = useMemo(() => {
    const map = new Map<number, string>();
    mapPayload?.data.houses.forEach((house) => {
      house.kkIds.forEach((kkId) => {
        map.set(kkId, house.id);
      });
    });
    return map;
  }, [mapPayload]);

  const filteredKkOptions = useMemo(() => {
    const query = kkSearch.trim().toLowerCase();
    if (!query) return kkOptions;
    return kkOptions.filter((item) => {
      return (
        item.nomorKk.toLowerCase().includes(query) ||
        item.alamat.toLowerCase().includes(query) ||
        (item.kepalaKeluarga || "").toLowerCase().includes(query)
      );
    });
  }, [kkOptions, kkSearch]);

  const visibleHouses = useMemo(() => {
    if (!mapPayload || !layerVisibility.houses) return [];
    return mapPayload.data.houses.filter((item) => rtFilter === "all" || item.rt === Number(rtFilter));
  }, [layerVisibility.houses, mapPayload, rtFilter]);

  const visibleAssets = useMemo(() => {
    if (!mapPayload || !layerVisibility.assets) return [];
    return mapPayload.data.assets.filter((item) => rtFilter === "all" || !item.rt || item.rt === Number(rtFilter));
  }, [layerVisibility.assets, mapPayload, rtFilter]);

  const visibleLines = useMemo(() => {
    if (!mapPayload || !layerVisibility.lines) return [];
    return mapPayload.data.lines;
  }, [layerVisibility.lines, mapPayload]);

  const visibleHazards = useMemo(() => {
    if (!mapPayload || !layerVisibility.hazards) return [];
    return mapPayload.data.hazards.filter((item) => rtFilter === "all" || !item.rt || item.rt === Number(rtFilter));
  }, [layerVisibility.hazards, mapPayload, rtFilter]);

  const currentCenter = mapPayload?.data.meta.center || DEFAULT_CENTER;
  const currentZoom = mapPayload?.data.meta.zoom || 19;

  function markDirty(next: MapPayload) {
    setMapPayload(next);
    setDirty(true);
  }

  function setModeAndReset(nextMode: EditorMode) {
    setMode(nextMode);
    if (nextMode !== "create-house" && nextMode !== "create-line") {
      setDraftCoordinates([]);
    }
  }

  function updateViewport(center: DenahLatLng, zoom: number) {
    if (!mapPayload) return;
    setMapPayload((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        data: {
          ...previous.data,
          meta: {
            ...previous.data.meta,
            center,
            zoom,
          },
        },
      };
    });
  }

  function updateSelectedHouse(updater: (house: DenahHouseFeature) => DenahHouseFeature) {
    if (!mapPayload || selected?.kind !== "house") return;
    markDirty({
      ...mapPayload,
      data: {
        ...mapPayload.data,
        houses: mapPayload.data.houses.map((house) => (house.id === selected.id ? updater(house) : house)),
      },
    });
  }

  function updateSelectedAsset(updater: (asset: DenahAssetFeature) => DenahAssetFeature) {
    if (!mapPayload || selected?.kind !== "asset") return;
    markDirty({
      ...mapPayload,
      data: {
        ...mapPayload.data,
        assets: mapPayload.data.assets.map((asset) => (asset.id === selected.id ? updater(asset) : asset)),
      },
    });
  }

  function updateSelectedLine(updater: (line: DenahLineFeature) => DenahLineFeature) {
    if (!mapPayload || selected?.kind !== "line") return;
    markDirty({
      ...mapPayload,
      data: {
        ...mapPayload.data,
        lines: mapPayload.data.lines.map((line) => (line.id === selected.id ? updater(line) : line)),
      },
    });
  }

  function updateSelectedHazard(updater: (hazard: DenahHazardFeature) => DenahHazardFeature) {
    if (!mapPayload || selected?.kind !== "hazard") return;
    markDirty({
      ...mapPayload,
      data: {
        ...mapPayload.data,
        hazards: mapPayload.data.hazards.map((hazard) => (hazard.id === selected.id ? updater(hazard) : hazard)),
      },
    });
  }

  function deleteSelectedFeature(target: SelectedFeature = selected) {
    if (!mapPayload || !target) return;
    const nextData =
      target.kind === "house"
        ? { ...mapPayload.data, houses: mapPayload.data.houses.filter((item) => item.id !== target.id) }
        : target.kind === "asset"
          ? { ...mapPayload.data, assets: mapPayload.data.assets.filter((item) => item.id !== target.id) }
          : target.kind === "line"
            ? { ...mapPayload.data, lines: mapPayload.data.lines.filter((item) => item.id !== target.id) }
            : { ...mapPayload.data, hazards: mapPayload.data.hazards.filter((item) => item.id !== target.id) };

    markDirty({ ...mapPayload, data: nextData });
    setSelected(null);
  }

  function handleMapClick(point: DenahLatLng) {
    if (!mapPayload) return;

    if (mode === "create-house" || mode === "create-line") {
      setDraftCoordinates((previous) => [...previous, point]);
      return;
    }

    if (mode === "create-asset") {
      const newAsset: DenahAssetFeature = {
        id: getFeatureId("asset"),
        type: pendingAssetType,
        label: "",
        rt: pendingAssetRt === "all" ? null : Number(pendingAssetRt),
        coordinates: point,
        notes: "",
      };
      markDirty({
        ...mapPayload,
        data: {
          ...mapPayload.data,
          assets: [...mapPayload.data.assets, newAsset],
        },
      });
      setSelected({ kind: "asset", id: newAsset.id });
      setMode("edit");
      return;
    }

    if (mode === "create-hazard") {
      const newHazard: DenahHazardFeature = {
        id: getFeatureId("hazard"),
        type: pendingHazardType,
        severity: pendingHazardSeverity,
        label: "",
        rt: pendingHazardRt === "all" ? null : Number(pendingHazardRt),
        coordinates: point,
        notes: "",
      };
      markDirty({
        ...mapPayload,
        data: {
          ...mapPayload.data,
          hazards: [...mapPayload.data.hazards, newHazard],
        },
      });
      setSelected({ kind: "hazard", id: newHazard.id });
      setMode("edit");
      return;
    }

    if (selected) {
      setSelected(null);
    }
  }

  function commitDraftShape() {
    if (!mapPayload) return;

    if (mode === "create-house") {
      if (draftCoordinates.length < 3) {
        toast({ title: "Bangunan butuh minimal 3 titik", variant: "destructive" });
        return;
      }
      const newHouse: DenahHouseFeature = {
        id: getFeatureId("house"),
        type: pendingBuildingType,
        name: `${getBuildingStyle(pendingBuildingType).label} ${mapPayload.data.houses.length + 1}`,
        rt: rtFilter === "all" ? null : Number(rtFilter),
        kkIds: [],
        coordinates: draftCoordinates,
        notes: "",
      };
      markDirty({
        ...mapPayload,
        data: {
          ...mapPayload.data,
          houses: [...mapPayload.data.houses, newHouse],
        },
      });
      setSelected({ kind: "house", id: newHouse.id });
      setDraftCoordinates([]);
      setMode("edit");
      return;
    }

    if (mode === "create-line") {
      if (draftCoordinates.length < 2) {
        toast({ title: "Garis butuh minimal 2 titik", variant: "destructive" });
        return;
      }
      const newLine: DenahLineFeature = {
        id: getFeatureId("line"),
        type: pendingLineType,
        label: "",
        coordinates: draftCoordinates,
        condition: pendingLineCondition,
        notes: "",
      };
      markDirty({
        ...mapPayload,
        data: {
          ...mapPayload.data,
          lines: [...mapPayload.data.lines, newLine],
        },
      });
      setSelected({ kind: "line", id: newLine.id });
      setDraftCoordinates([]);
      setMode("edit");
    }
  }

  function handleFeatureClick(feature: SelectedFeature) {
    if (mode === "delete") {
      setSelected(feature);
      deleteSelectedFeature(feature);
      return;
    }
    setSelected(feature);
  }

  function stopLeafletClickPropagation(event: L.LeafletMouseEvent) {
    if (event.originalEvent) {
      L.DomEvent.stopPropagation(event.originalEvent);
    }
  }

  function updateHouseVertex(vertexIndex: number, nextPoint: DenahLatLng) {
    updateSelectedHouse((house) => ({
      ...house,
      coordinates: house.coordinates.map((point, index) => (index === vertexIndex ? nextPoint : point)),
    }));
  }

  function updateLineVertex(vertexIndex: number, nextPoint: DenahLatLng) {
    updateSelectedLine((line) => ({
      ...line,
      coordinates: line.coordinates.map((point, index) => (index === vertexIndex ? nextPoint : point)),
    }));
  }

  function toggleHouseKk(kkId: number, checked: boolean) {
    if (!mapPayload || !selectedHouse) return;

    const ownerHouseId = assignedKkMap.get(kkId);
    const ownerHouse = mapPayload.data.houses.find((house) => house.id === ownerHouseId);

    const nextHouses = mapPayload.data.houses.map((house) => {
      if (house.id === selectedHouse.id) {
        if (checked) {
          const nextKkIds = house.kkIds.includes(kkId) ? house.kkIds : [...house.kkIds, kkId];
          return { ...house, kkIds: nextKkIds };
        }
        return { ...house, kkIds: house.kkIds.filter((item) => item !== kkId) };
      }

      if (checked && ownerHouseId && house.id === ownerHouseId) {
        return { ...house, kkIds: house.kkIds.filter((item) => item !== kkId) };
      }

      return house;
    });

    markDirty({
      ...mapPayload,
      data: {
        ...mapPayload.data,
        houses: nextHouses,
      },
    });

    if (checked && ownerHouse && ownerHouse.id !== selectedHouse.id) {
      toast({
        title: "KK dipindahkan ke bangunan baru",
        description: `${ownerHouse.name || getBuildingStyle(ownerHouse.type || "rumah").label} dilepas dari KK yang sama.`,
      });
    }
  }

  const modeSummary =
    mode === "create-house"
      ? {
          title: "Tambah bangunan",
          description: "Pilih jenis bangunan, klik beberapa titik di peta, lalu simpan bentuknya.",
        }
      : mode === "create-line"
        ? {
            title: "Tambah garis",
            description: "Klik beberapa titik untuk menggambar sungai, drainase, atau batas jalan.",
          }
        : mode === "create-asset"
          ? {
              title: "Tambah aset",
              description: "Klik sekali di peta untuk meletakkan marker aset.",
            }
          : mode === "create-hazard"
            ? {
                title: "Tambah bahaya",
                description: "Klik sekali di peta untuk menaruh penanda bahaya.",
              }
            : mode === "edit"
              ? {
                  title: "Edit objek",
                  description: "Pilih objek di peta lalu ubah propertinya dari panel kanan atau geser titiknya langsung.",
                }
              : mode === "delete"
                ? {
                    title: "Hapus objek",
                    description: "Klik objek yang ingin dihapus dari peta.",
                  }
                : {
                    title: "Siap memetakan",
                    description: "Pilih mode dari toolbar lalu mulai gambar langsung di atas peta.",
                  };

  const selectionSummary = selected
    ? selected.kind === "house"
      ? {
          label: getBuildingStyle(selectedHouse?.type || "rumah").label,
          description: selectedHouse?.name?.trim() || "Bangunan terpilih",
        }
      : selected.kind === "asset"
        ? {
            label: "Aset",
            description: selectedAsset?.label?.trim() || ASSET_OPTIONS.find((item) => item.value === selectedAsset?.type)?.label || "Aset terpilih",
          }
        : selected.kind === "line"
          ? {
              label: "Garis",
              description: selectedLine?.label?.trim() || LINE_OPTIONS.find((item) => item.value === selectedLine?.type)?.label || "Garis terpilih",
            }
          : {
              label: "Bahaya",
              description:
                selectedHazard?.label?.trim() || HAZARD_OPTIONS.find((item) => item.value === selectedHazard?.type)?.label || "Bahaya terpilih",
            }
    : {
        label: "Belum ada objek dipilih",
        description: "Klik bangunan, marker, atau garis di peta untuk membuka detailnya.",
      };

  if (isLoading || !mapPayload) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 lg:grid-cols-[1.3fr_380px]">
          <Skeleton className="h-[72vh] rounded-3xl" />
          <Skeleton className="h-[72vh] rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div>
            <p className="font-semibold">Peta gagal dimuat</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Terjadi kesalahan saat mengambil data peta."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(135deg,rgba(15,118,110,0.12),rgba(34,197,94,0.05))] p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">Peta Wilayah RW</p>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
                Editor peta interaktif dengan flow yang lebih fokus ke kanvas
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground lg:text-base">
                Pilih mode dari toolbar yang melayang di atas peta, gambar langsung di kanvas, lalu kelola detail objek dari panel tab di kanan.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</p>
              <p className="mt-2 text-lg font-semibold">{dirty ? "Belum disimpan" : "Tersimpan"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{mapPayload.data.houses.length} bangunan tergambar</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mode Aktif</p>
              <p className="mt-2 text-lg font-semibold">{modeSummary.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{draftCoordinates.length ? `${draftCoordinates.length} titik draft` : "Siap digunakan"}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Seleksi</p>
              <p className="mt-2 text-lg font-semibold">{selectionSummary.label}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{selectionSummary.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.8fr)_430px]">
        <div className="min-w-0">
          <Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm">
            <div className="border-b border-border/60 bg-muted/20 px-4 py-3 lg:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-foreground">Kanvas Peta</p>
                  <p className="text-sm text-muted-foreground">Peta jadi area kerja utama. Zoom, gambar, lalu pilih objek untuk mengedit.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={dirty ? "default" : "secondary"} className="rounded-full px-3 py-1">
                    {dirty ? "Belum disimpan" : "Tersimpan"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full">Zoom {currentZoom.toFixed(1)}x</Badge>
                  <Badge variant="outline" className="rounded-full">{visibleHouses.length} bangunan</Badge>
                  <Badge variant="outline" className="rounded-full">{visibleLines.length} garis</Badge>
                </div>
              </div>
            </div>
            <CardContent className="p-0">
              <div className="relative h-[80vh] min-h-[680px] w-full overflow-hidden">
                <div className="pointer-events-none absolute inset-x-4 top-4 z-[1000] flex flex-col gap-3">
                  <div className="pointer-events-auto mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 rounded-[26px] border border-white/70 bg-white/88 p-3 shadow-xl backdrop-blur">
                    <div className="flex flex-1 flex-wrap gap-2">
                      <Button className="h-11 rounded-2xl" variant={mode === "create-house" ? "default" : "outline"} onClick={() => setModeAndReset("create-house")}>
                        <House className="mr-2 h-4 w-4" />
                        Bangunan
                      </Button>
                      <Button className="h-11 rounded-2xl" variant={mode === "create-asset" ? "default" : "outline"} onClick={() => setModeAndReset("create-asset")}>
                        <MapPin className="mr-2 h-4 w-4" />
                        Aset
                      </Button>
                      <Button className="h-11 rounded-2xl" variant={mode === "create-line" ? "default" : "outline"} onClick={() => setModeAndReset("create-line")}>
                        <Waves className="mr-2 h-4 w-4" />
                        Garis
                      </Button>
                      <Button className="h-11 rounded-2xl" variant={mode === "create-hazard" ? "default" : "outline"} onClick={() => setModeAndReset("create-hazard")}>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Bahaya
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button className="h-11 rounded-2xl" variant={mode === "edit" ? "default" : "outline"} onClick={() => setModeAndReset("edit")}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button className="h-11 rounded-2xl" variant={mode === "delete" ? "destructive" : "outline"} onClick={() => setModeAndReset("delete")}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus
                      </Button>
                      <Button className="h-11 rounded-2xl" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                        <Save className="mr-2 h-4 w-4" />
                        {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
                      </Button>
                    </div>
                  </div>

                  <div className="pointer-events-auto mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 rounded-[22px] border border-white/70 bg-white/88 px-4 py-3 shadow-lg backdrop-blur">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{modeSummary.title}</p>
                      <p className="text-xs text-muted-foreground">{modeSummary.description}</p>
                    </div>

                    {(mode === "create-house" || mode === "create-line") && (
                      <>
                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                          {draftCoordinates.length} titik
                        </Badge>
                        <Button variant="secondary" onClick={commitDraftShape}>
                          Simpan Bentuk
                        </Button>
                        <Button variant="ghost" onClick={() => setDraftCoordinates([])}>
                          Reset Titik
                        </Button>
                      </>
                    )}

                    {selected && (
                      <Button variant="outline" onClick={deleteSelectedFeature}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus Terpilih
                      </Button>
                    )}
                  </div>
                </div>

                <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] flex max-w-sm flex-col gap-3">
                  <div className="pointer-events-auto rounded-3xl border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Setup Cepat</p>
                    <div className="mt-3 space-y-3">
                      {mode === "create-house" && (
                        <div className="space-y-2">
                          <Label>Jenis Bangunan</Label>
                          <Select value={pendingBuildingType} onValueChange={(value) => setPendingBuildingType(value as DenahBuildingType)}>
                            <SelectTrigger className="bg-background/90">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BUILDING_TYPE_OPTIONS.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {mode === "create-asset" && (
                        <div className="grid gap-2">
                          <div className="space-y-2">
                            <Label>Jenis Aset</Label>
                            <Select value={pendingAssetType} onValueChange={(value) => setPendingAssetType(value as DenahAssetType)}>
                              <SelectTrigger className="bg-background/90">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ASSET_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>RT</Label>
                            <Select value={pendingAssetRt} onValueChange={setPendingAssetRt}>
                              <SelectTrigger className="bg-background/90">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tanpa RT khusus</SelectItem>
                                {rtOptions.map((rt) => (
                                  <SelectItem key={rt} value={String(rt)}>
                                    RT {String(rt).padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {mode === "create-line" && (
                        <div className="grid gap-2">
                          <div className="space-y-2">
                            <Label>Jenis Garis</Label>
                            <Select value={pendingLineType} onValueChange={(value) => setPendingLineType(value as DenahLineType)}>
                              <SelectTrigger className="bg-background/90">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LINE_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Kondisi</Label>
                            <Select value={pendingLineCondition} onValueChange={(value) => setPendingLineCondition(value as DenahLineCondition)}>
                              <SelectTrigger className="bg-background/90">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LINE_CONDITION_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {mode === "create-hazard" && (
                        <div className="grid gap-2">
                          <div className="space-y-2">
                            <Label>Jenis Bahaya</Label>
                            <Select value={pendingHazardType} onValueChange={(value) => setPendingHazardType(value as DenahHazardType)}>
                              <SelectTrigger className="bg-background/90">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {HAZARD_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Tingkat</Label>
                              <Select value={pendingHazardSeverity} onValueChange={(value) => setPendingHazardSeverity(value as DenahHazardSeverity)}>
                                <SelectTrigger className="bg-background/90">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {HAZARD_SEVERITY_OPTIONS.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                      {item.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>RT</Label>
                              <Select value={pendingHazardRt} onValueChange={setPendingHazardRt}>
                                <SelectTrigger className="bg-background/90">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Tanpa RT khusus</SelectItem>
                                  {rtOptions.map((rt) => (
                                    <SelectItem key={rt} value={String(rt)}>
                                      RT {String(rt).padStart(2, "0")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}

                      {mode === "idle" && (
                        <p className="text-sm leading-6 text-muted-foreground">
                          Pilih mode dari toolbar di atas, lalu semua setup cepat akan muncul di sini supaya tidak perlu bolak-balik ke panel kanan.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <MapContainer
                  center={[currentCenter.lat, currentCenter.lng]}
                  zoom={currentZoom}
                  className="h-full w-full"
                  doubleClickZoom={false}
                  minZoom={16}
                  maxZoom={23}
                  zoomSnap={0.5}
                  zoomDelta={0.5}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxNativeZoom={19}
                    maxZoom={23}
                  />

                  <MapInteractionLayer onClick={handleMapClick} onViewportChange={updateViewport} />

                  {visibleHouses.map((house) => {
                    const isSelected = selected?.kind === "house" && selected.id === house.id;
                    const buildingStyle = getBuildingStyle(house.type || "rumah");
                    const labelMetrics = getHouseLabelMetrics(house, currentZoom);
                    const houseKkOptions = house.kkIds
                      .map((kkId) => kkOptions.find((item) => item.id === kkId))
                      .filter((item): item is KkOption => Boolean(item));
                    const primaryKk = houseKkOptions[0] || null;
                    const popupWhatsapp = formatWhatsappNumber(primaryKk?.nomorWhatsapp);
                    return (
                      <Polygon
                        key={house.id}
                        positions={house.coordinates.map((point) => [point.lat, point.lng])}
                        pathOptions={{
                          color: isSelected ? "#0f766e" : buildingStyle.stroke,
                          fillColor: isSelected ? "#0f766e" : buildingStyle.fill,
                          fillOpacity: isSelected ? 0.3 : 0.12,
                          weight: isSelected ? 4.5 : 3.5,
                        }}
                        eventHandlers={{
                          click: (event) => {
                            stopLeafletClickPropagation(event);
                            handleFeatureClick({ kind: "house", id: house.id });
                          },
                        }}
                      >
                        {(labelMetrics.visible || isSelected) && (
                          <Tooltip permanent direction="center" opacity={1} className="house-label-tooltip">
                            <span
                              style={{
                                display: "inline-block",
                                maxWidth: `${labelMetrics.maxWidth}px`,
                                padding: `${labelMetrics.paddingY}px ${labelMetrics.paddingX}px`,
                                borderRadius: "999px",
                                background: "rgba(255,255,255,0.78)",
                                color: "#0f172a",
                                fontSize: `${labelMetrics.fontSize}px`,
                                lineHeight: 1,
                                fontWeight: 700,
                                textAlign: "center",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                boxShadow: "0 1px 2px rgba(15,23,42,0.12)",
                              }}
                            >
                              {formatHouseCompactLabel(house)}
                            </span>
                          </Tooltip>
                        )}
                        {isSelected ? (
                          <>
                            <Tooltip direction="top" opacity={0.95}>
                              {formatHouseLabel(house, kkOptions)}
                            </Tooltip>
                            <Popup autoPan maxWidth={180} className="house-info-popup">
                              <div className="w-[156px] space-y-2">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Blok Terpilih</p>
                                  <p className="mt-1 truncate text-sm font-semibold text-foreground">
                                    {house.name?.trim() || getBuildingStyle(house.type || "rumah").label}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {getBuildingStyle(house.type || "rumah").label}
                                    {house.rt ? ` • RT ${String(house.rt).padStart(2, "0")}` : ""}
                                  </p>
                                </div>
                                <div className="grid gap-1 text-xs">
                                  <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">WA</p>
                                    <p className="truncate font-medium text-foreground">{popupWhatsapp || "-"}</p>
                                  </div>
                                  <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">KK</p>
                                    <p className="font-medium text-foreground">{house.kkIds.length} KK terpasang</p>
                                  </div>
                                </div>
                              </div>
                            </Popup>
                          </>
                        ) : null}
                      </Polygon>
                    );
                  })}

                  {visibleLines.map((line) => {
                    const style = LINE_OPTIONS.find((item) => item.value === line.type);
                    const isSelected = selected?.kind === "line" && selected.id === line.id;
                    return (
                      <Polyline
                        key={line.id}
                        positions={line.coordinates.map((point) => [point.lat, point.lng])}
                        pathOptions={{
                          color: line.condition === "rusak" ? "#dc2626" : style?.color || "#2563eb",
                          weight: isSelected ? 6 : 4.5,
                          dashArray: line.type === "drainase" ? "8 8" : undefined,
                        }}
                        eventHandlers={{
                          click: (event) => {
                            stopLeafletClickPropagation(event);
                            handleFeatureClick({ kind: "line", id: line.id });
                          },
                        }}
                      >
                        <Tooltip>{line.label || style?.label || "Garis"}</Tooltip>
                      </Polyline>
                    );
                  })}

                  {visibleAssets.map((asset) => {
                    const style = ASSET_OPTIONS.find((item) => item.value === asset.type);
                    const isSelected = selected?.kind === "asset" && selected.id === asset.id;
                    return (
                      <Marker
                        key={asset.id}
                        position={[asset.coordinates.lat, asset.coordinates.lng]}
                        icon={makeBadgeIcon(style?.shortLabel || "AST", style?.color || "#0f766e", isSelected)}
                        draggable={isSelected && mode === "edit"}
                        eventHandlers={{
                          click: (event) => {
                            stopLeafletClickPropagation(event);
                            handleFeatureClick({ kind: "asset", id: asset.id });
                          },
                          dragend: (event) => {
                            const latlng = (event.target as L.Marker).getLatLng();
                            updateSelectedAsset((current) => ({
                              ...current,
                              coordinates: { lat: latlng.lat, lng: latlng.lng },
                            }));
                          },
                        }}
                      >
                        <Tooltip>{asset.label || style?.label || "Aset"}</Tooltip>
                      </Marker>
                    );
                  })}

                  {visibleHazards.map((hazard) => {
                    const style = HAZARD_OPTIONS.find((item) => item.value === hazard.type);
                    const isSelected = selected?.kind === "hazard" && selected.id === hazard.id;
                    return (
                      <Marker
                        key={hazard.id}
                        position={[hazard.coordinates.lat, hazard.coordinates.lng]}
                        icon={makeBadgeIcon(style?.shortLabel || "H", style?.color || "#b91c1c", isSelected)}
                        draggable={isSelected && mode === "edit"}
                        eventHandlers={{
                          click: (event) => {
                            stopLeafletClickPropagation(event);
                            handleFeatureClick({ kind: "hazard", id: hazard.id });
                          },
                          dragend: (event) => {
                            const latlng = (event.target as L.Marker).getLatLng();
                            updateSelectedHazard((current) => ({
                              ...current,
                              coordinates: { lat: latlng.lat, lng: latlng.lng },
                            }));
                          },
                        }}
                      >
                        <Tooltip>{hazard.label || style?.label || "Bahaya"}</Tooltip>
                      </Marker>
                    );
                  })}

                  {mode === "create-house" && draftCoordinates.length > 0 && (
                    <Polygon
                      positions={draftCoordinates.map((point) => [point.lat, point.lng])}
                      pathOptions={{
                        color: "#0f766e",
                        fillColor: "#14b8a6",
                        fillOpacity: 0.18,
                        dashArray: "6 6",
                        weight: 2,
                      }}
                    />
                  )}

                  {mode === "create-line" && draftCoordinates.length > 0 && (
                    <Polyline
                      positions={draftCoordinates.map((point) => [point.lat, point.lng])}
                      pathOptions={{
                        color: "#2563eb",
                        weight: 4,
                        dashArray: "6 6",
                      }}
                    />
                  )}

                  {selectedHouse && mode === "edit" &&
                    selectedHouse.coordinates.map((point, index) => (
                      <Marker
                        key={`${selectedHouse.id}-vertex-${index}`}
                        position={[point.lat, point.lng]}
                        icon={vertexIcon}
                        draggable
                        eventHandlers={{
                          dragend: (event) => {
                            const latlng = (event.target as L.Marker).getLatLng();
                            updateHouseVertex(index, { lat: latlng.lat, lng: latlng.lng });
                          },
                        }}
                      />
                    ))}

                  {selectedLine && mode === "edit" &&
                    selectedLine.coordinates.map((point, index) => (
                      <Marker
                        key={`${selectedLine.id}-vertex-${index}`}
                        position={[point.lat, point.lng]}
                        icon={vertexIcon}
                        draggable
                        eventHandlers={{
                          dragend: (event) => {
                            const latlng = (event.target as L.Marker).getLatLng();
                            updateLineVertex(index, { lat: latlng.lat, lng: latlng.lng });
                          },
                        }}
                      />
                    ))}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 2xl:sticky 2xl:top-6 2xl:h-[calc(100vh-2rem)]">
          <Card className="flex h-full flex-col border-border/70 bg-card/95 shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-xl">Panel Konteks</CardTitle>
              <CardDescription>
                Detail objek, assignment KK, layer, dan legenda dipisah per tab supaya langkah kerjanya lebih fokus.
              </CardDescription>
            </CardHeader>

            <Tabs value={panelTab} onValueChange={(value) => setPanelTab(value as "detail" | "kk" | "layer" | "legend")} className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-border/60 px-6 py-4">
                <div className="mb-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Fokus Saat Ini</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{selectionSummary.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selectionSummary.description}</p>
                </div>
                <TabsList className="grid h-auto w-full grid-cols-4 rounded-2xl bg-muted/60 p-1">
                  <TabsTrigger value="detail" className="rounded-xl">Detail</TabsTrigger>
                  <TabsTrigger value="kk" className="rounded-xl" disabled={!selectedHouse}>Assign KK</TabsTrigger>
                  <TabsTrigger value="layer" className="rounded-xl">Layer</TabsTrigger>
                  <TabsTrigger value="legend" className="rounded-xl">Legenda</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  <TabsContent value="detail" className="mt-0 space-y-5">
                    <div className="space-y-4 rounded-3xl border border-border/60 bg-muted/20 p-4">
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">Mode Aktif</p>
                        <p className="text-sm text-muted-foreground">{modeSummary.description}</p>
                      </div>

                      {mode === "create-house" && (
                        <div className="space-y-2">
                          <Label>Jenis Bangunan</Label>
                          <Select value={pendingBuildingType} onValueChange={(value) => setPendingBuildingType(value as DenahBuildingType)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BUILDING_TYPE_OPTIONS.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {mode === "create-asset" && (
                        <>
                          <div className="space-y-2">
                            <Label>Jenis Aset Baru</Label>
                            <Select value={pendingAssetType} onValueChange={(value) => setPendingAssetType(value as DenahAssetType)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ASSET_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>RT Aset</Label>
                            <Select value={pendingAssetRt} onValueChange={setPendingAssetRt}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tanpa RT khusus</SelectItem>
                                {rtOptions.map((rt) => (
                                  <SelectItem key={rt} value={String(rt)}>
                                    RT {String(rt).padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {mode === "create-line" && (
                        <>
                          <div className="space-y-2">
                            <Label>Jenis Garis</Label>
                            <Select value={pendingLineType} onValueChange={(value) => setPendingLineType(value as DenahLineType)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LINE_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Kondisi Garis</Label>
                            <Select value={pendingLineCondition} onValueChange={(value) => setPendingLineCondition(value as DenahLineCondition)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LINE_CONDITION_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {mode === "create-hazard" && (
                        <>
                          <div className="space-y-2">
                            <Label>Jenis Bahaya</Label>
                            <Select value={pendingHazardType} onValueChange={(value) => setPendingHazardType(value as DenahHazardType)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {HAZARD_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Tingkat Bahaya</Label>
                            <Select value={pendingHazardSeverity} onValueChange={(value) => setPendingHazardSeverity(value as DenahHazardSeverity)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {HAZARD_SEVERITY_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>RT Bahaya</Label>
                            <Select value={pendingHazardRt} onValueChange={setPendingHazardRt}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tanpa RT khusus</SelectItem>
                                {rtOptions.map((rt) => (
                                  <SelectItem key={rt} value={String(rt)}>
                                    RT {String(rt).padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-4 rounded-3xl border border-border/60 bg-muted/20 p-4">
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">Properti Objek</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedHouse && "Kelola polygon bangunan dari sini, lalu pindah ke tab Assign KK jika ingin memasang KK."}
                          {selectedAsset && "Ubah detail aset, label, dan RT."}
                          {selectedLine && "Atur jenis garis, label, dan kondisi."}
                          {selectedHazard && "Ubah tipe bahaya, tingkat, dan catatan."}
                          {!selected && "Belum ada objek dipilih. Klik salah satu objek di peta untuk membuka detailnya."}
                        </p>
                      </div>

                      {selectedHouse && (
                        <>
                          <div className="space-y-2">
                            <Label>Jenis Bangunan</Label>
                            <Select
                              value={selectedHouse.type || "rumah"}
                              onValueChange={(value) =>
                                updateSelectedHouse((house) => ({
                                  ...house,
                                  type: value as DenahBuildingType,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {BUILDING_TYPE_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Nama / Nomor Bangunan</Label>
                            <Input value={selectedHouse.name} onChange={(event) => updateSelectedHouse((house) => ({ ...house, name: event.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>RT</Label>
                            <Select
                              value={selectedHouse.rt ? String(selectedHouse.rt) : "none"}
                              onValueChange={(value) =>
                                updateSelectedHouse((house) => ({
                                  ...house,
                                  rt: value === "none" ? null : Number(value),
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Tanpa RT</SelectItem>
                                {rtOptions.map((rt) => (
                                  <SelectItem key={rt} value={String(rt)}>
                                    RT {String(rt).padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Catatan</Label>
                            <Textarea
                              value={selectedHouse.notes}
                              onChange={(event) => updateSelectedHouse((house) => ({ ...house, notes: event.target.value }))}
                              className="min-h-[96px]"
                            />
                          </div>
                          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
                            {getBuildingStyle(selectedHouse.type || "rumah").label} ini memiliki <span className="font-semibold">{selectedHouse.coordinates.length}</span> titik dan{" "}
                            <span className="font-semibold">{selectedHouse.kkIds.length}</span> KK.
                          </div>
                        </>
                      )}

                      {selectedAsset && (
                        <>
                          <div className="space-y-2">
                            <Label>Jenis Aset</Label>
                            <Select
                              value={selectedAsset.type}
                              onValueChange={(value) => updateSelectedAsset((asset) => ({ ...asset, type: value as DenahAssetType }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ASSET_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Label</Label>
                            <Input value={selectedAsset.label} onChange={(event) => updateSelectedAsset((asset) => ({ ...asset, label: event.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>RT</Label>
                            <Select
                              value={selectedAsset.rt ? String(selectedAsset.rt) : "none"}
                              onValueChange={(value) =>
                                updateSelectedAsset((asset) => ({
                                  ...asset,
                                  rt: value === "none" ? null : Number(value),
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Tanpa RT</SelectItem>
                                {rtOptions.map((rt) => (
                                  <SelectItem key={rt} value={String(rt)}>
                                    RT {String(rt).padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Catatan</Label>
                            <Textarea
                              value={selectedAsset.notes}
                              onChange={(event) => updateSelectedAsset((asset) => ({ ...asset, notes: event.target.value }))}
                              className="min-h-[96px]"
                            />
                          </div>
                        </>
                      )}

                      {selectedLine && (
                        <>
                          <div className="space-y-2">
                            <Label>Jenis Garis</Label>
                            <Select
                              value={selectedLine.type}
                              onValueChange={(value) => updateSelectedLine((line) => ({ ...line, type: value as DenahLineType }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LINE_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Kondisi</Label>
                            <Select
                              value={selectedLine.condition}
                              onValueChange={(value) =>
                                updateSelectedLine((line) => ({ ...line, condition: value as DenahLineCondition }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LINE_CONDITION_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Label</Label>
                            <Input value={selectedLine.label} onChange={(event) => updateSelectedLine((line) => ({ ...line, label: event.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Catatan</Label>
                            <Textarea
                              value={selectedLine.notes}
                              onChange={(event) => updateSelectedLine((line) => ({ ...line, notes: event.target.value }))}
                              className="min-h-[96px]"
                            />
                          </div>
                          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
                            Garis ini memiliki <span className="font-semibold">{selectedLine.coordinates.length}</span> titik.
                          </div>
                        </>
                      )}

                      {selectedHazard && (
                        <>
                          <div className="space-y-2">
                            <Label>Jenis Bahaya</Label>
                            <Select
                              value={selectedHazard.type}
                              onValueChange={(value) => updateSelectedHazard((hazard) => ({ ...hazard, type: value as DenahHazardType }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {HAZARD_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Tingkat Bahaya</Label>
                            <Select
                              value={selectedHazard.severity}
                              onValueChange={(value) =>
                                updateSelectedHazard((hazard) => ({ ...hazard, severity: value as DenahHazardSeverity }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {HAZARD_SEVERITY_OPTIONS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>RT</Label>
                            <Select
                              value={selectedHazard.rt ? String(selectedHazard.rt) : "none"}
                              onValueChange={(value) =>
                                updateSelectedHazard((hazard) => ({
                                  ...hazard,
                                  rt: value === "none" ? null : Number(value),
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Tanpa RT</SelectItem>
                                {rtOptions.map((rt) => (
                                  <SelectItem key={rt} value={String(rt)}>
                                    RT {String(rt).padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Label</Label>
                            <Input value={selectedHazard.label} onChange={(event) => updateSelectedHazard((hazard) => ({ ...hazard, label: event.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Catatan</Label>
                            <Textarea
                              value={selectedHazard.notes}
                              onChange={(event) => updateSelectedHazard((hazard) => ({ ...hazard, notes: event.target.value }))}
                              className="min-h-[96px]"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="kk" className="mt-0 space-y-4">
                    {selectedHouse ? (
                      <div className="space-y-4 rounded-3xl border border-border/60 bg-muted/20 p-4">
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground">Assign KK ke Bangunan</p>
                          <p className="text-sm text-muted-foreground">
                            Cari lalu centang KK yang ingin dipasang ke {selectedHouse.name?.trim() || getBuildingStyle(selectedHouse.type || "rumah").label.toLowerCase()}.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Cari KK</Label>
                          <Input
                            value={kkSearch}
                            onChange={(event) => setKkSearch(event.target.value)}
                            placeholder="Cari nomor KK, alamat, atau kepala keluarga..."
                          />
                        </div>

                        <ScrollArea className="h-[460px] rounded-xl border border-border/60 bg-background/90">
                          <div className="space-y-2 p-3">
                            {filteredKkOptions.map((item) => {
                              const assignedHouseId = assignedKkMap.get(item.id);
                              const assignedElsewhere = assignedHouseId && assignedHouseId !== selectedHouse.id;
                              return (
                                <label
                                  key={item.id}
                                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 px-3 py-2"
                                >
                                  <Checkbox
                                    checked={selectedHouse.kkIds.includes(item.id)}
                                    onCheckedChange={(checked) => toggleHouseKk(item.id, checked === true)}
                                  />
                                  <div className="min-w-0 text-sm">
                                    <p className="font-medium">{item.kepalaKeluarga || "Kepala keluarga belum diisi"}</p>
                                    <p className="text-xs text-muted-foreground">
                                      KK {item.nomorKk} • RT {String(item.rt).padStart(2, "0")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{item.alamat}</p>
                                    {assignedElsewhere && (
                                      <p className="mt-1 text-xs text-amber-600">
                                        Saat ini terpasang di bangunan lain. Jika dicentang, KK akan dipindahkan.
                                      </p>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
                        Pilih satu bangunan dulu dari peta, lalu tab ini akan menampilkan daftar KK untuk di-assign.
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="layer" className="mt-0 space-y-4">
                    <div className="space-y-4 rounded-3xl border border-border/60 bg-muted/20 p-4">
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">Pengaturan Peta</p>
                        <p className="text-sm text-muted-foreground">Nama peta, filter RT, dan visibilitas layer ditaruh di satu tab khusus.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="map-name">Nama Peta</Label>
                        <Input
                          id="map-name"
                          value={mapPayload.nama}
                          onChange={(event) =>
                            markDirty({
                              ...mapPayload,
                              nama: event.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Filter RT</Label>
                          <Select value={rtFilter} onValueChange={setRtFilter}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Semua RT</SelectItem>
                              {rtOptions.map((rt) => (
                                <SelectItem key={rt} value={String(rt)}>
                                  RT {String(rt).padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Center</p>
                          <p className="mt-2 text-sm font-medium text-foreground">
                            {currentCenter.lat.toFixed(5)}, {currentCenter.lng.toFixed(5)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-medium">Layer</p>
                        {[
                          { key: "houses", label: "Bangunan" },
                          { key: "assets", label: "Aset" },
                          { key: "lines", label: "Garis" },
                          { key: "hazards", label: "Bahaya" },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                            <span className="text-sm font-medium">{item.label}</span>
                            <Switch
                              checked={layerVisibility[item.key as keyof typeof layerVisibility]}
                              onCheckedChange={(checked) =>
                                setLayerVisibility((previous) => ({
                                  ...previous,
                                  [item.key]: checked,
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="legend" className="mt-0">
                    <div className="space-y-4 rounded-3xl border border-border/60 bg-muted/20 p-4">
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">Legenda</p>
                        <p className="text-sm text-muted-foreground">Warna dan simbol tetap untuk semua objek peta.</p>
                      </div>
                      <FeatureLegend />
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
