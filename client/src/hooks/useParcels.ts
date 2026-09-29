import { computeGeodesicMetrics } from "../utils/geoMetrics";
import useSWR from "swr";
import {
  parcelApi,
  ParcelFeature,
  ParcelFeatureCollection,
} from "../api/parcelApi";
import { PARCELS_DATA } from "../data/parcels";

export interface UseParcelsResult {
  parcels: ParcelFeatureCollection | null;
  features: ParcelFeature[];
  properties: any;
  totalParcels: number;
  encroachments: ParcelFeature[];
  encroachmentCount: number;
  totalAreaSqM: number;
  totalAreaHectares: string;
  avgConfidence: string | number;
  isLoading: boolean;
  isError: any;
  mutate: () => Promise<any>;
}

export function useParcels(): UseParcelsResult {
  const {
    data: parcelsData,
    error,
    isLoading,
    mutate,
  } = useSWR("/api/parcels", parcelApi.getParcels, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const staticFeatures: ParcelFeature[] = PARCELS_DATA.map((p) => ({
    type: "Feature",
    id: p.id,
    properties: {
      parcelId: p.id,
      title: p.name,
      ownerName: "BIAS Campus",
      landUse: p.type,
      status: p.status,
      areaSqM: p.areaSqM,
      area_sqm: p.areaSqM,
      encroachment: false,
      confidence: 0.98,
    },
    geometry: {
      type: "Polygon",
      coordinates: [[...p.coordinates.map((c) => [c[1], c[0]])]],
    },
  }));

  const features: ParcelFeature[] =
    parcelsData?.features && parcelsData.features.length > 0
      ? parcelsData.features
      : staticFeatures;
  const properties = parcelsData?.properties || {};

  const totalParcels = features.length;
  const encroachmentParcels = features.filter(
    (f) => f.properties?.encroachment,
  );

  const CAMPUS_PARCEL_COORDS: [number, number][][] = [
    [
      [29.3577, 79.5516],
      [29.35785, 79.55195],
      [29.3575, 79.55215],
      [29.35705, 79.55185],
      [29.3568, 79.55165],
      [29.35695, 79.5514],
      [29.35735, 79.55158],
      [29.35752, 79.55145],
    ],

    [
      [29.3568, 79.55072],
      [29.35672, 79.55132],
      [29.35632, 79.55124],
      [29.3564, 79.55064],
    ],

    [
      [29.35588, 79.5529],
      [29.35608, 79.5535],
      [29.3556, 79.55368],
      [29.3554, 79.55308],
    ],

    [
      [29.35738, 79.55218],
      [29.35708, 79.55318],
      [29.35598, 79.55282],
      [29.3563, 79.55198],
    ],
  ];
  const cadastralTotalAreaSqM = CAMPUS_PARCEL_COORDS.reduce(
    (sum, coords) => sum + computeGeodesicMetrics(coords).area_m2,
    0,
  );

  const totalAreaSqM = features.reduce(
    (acc, f) =>
      acc +
      (parseFloat(
        f.properties?.legalArea ||
          f.properties?.detectedArea ||
          f.properties?.area ||
          f.properties?.areaSqM ||
          f.properties?.area_sqm,
      ) || 0),
    0,
  );
  const totalAreaHectares = (totalAreaSqM / 10000).toFixed(2);
  const avgConfidence =
    totalParcels > 0
      ? (
          (features.reduce(
            (acc, f) => acc + (f.properties?.confidence || 0),
            0,
          ) /
            totalParcels) *
          100
        ).toFixed(1)
      : 0;

  return {
    parcels: parcelsData || null,
    features,
    properties,
    totalParcels,
    encroachments: encroachmentParcels,
    encroachmentCount: encroachmentParcels.length,
    totalAreaSqM: Math.round(totalAreaSqM),
    totalAreaHectares,
    avgConfidence,
    isLoading,
    isError: error,
    mutate,
  };
}
