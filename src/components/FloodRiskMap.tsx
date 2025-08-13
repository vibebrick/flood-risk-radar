import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from '@/components/ui/button';

interface FloodRiskMapProps {
  searchLocation?: { latitude: number; longitude: number; address: string };
  searchRadius: number;
  heatmapPoints?: Array<{ latitude: number; longitude: number; weight?: number }>;
  onLocationSelect?: (location: { latitude: number; longitude: number; address: string }) => void;
}

const FloodRiskMapComponent: React.FC<FloodRiskMapProps> = ({
  searchLocation,
  searchRadius,
  heatmapPoints,
  onLocationSelect
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const currentTileSource = useRef(0);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const pinMarkerRef = useRef<maplibregl.Marker | null>(null);
  const initializationRef = useRef(false);

  // Memoized tile sources
  const tileSources = useMemo(() => [
    {
      name: 'OpenStreetMap Multi-Server',
      style: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      type: 'raster',
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    },
    {
      name: 'Stamen Terrain',
      style: ['https://stamen-tiles-a.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png', 'https://stamen-tiles-b.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png'],
      type: 'raster',
      maxZoom: 18,
      attribution: '© Stamen Design'
    },
    {
      name: 'CartoDB Light',
      style: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', 'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
      type: 'raster',
      maxZoom: 19,
      attribution: '© CartoDB'
    },
    {
      name: 'WMTS OSM',
      style: ['https://tiles.wmflabs.org/osm/{z}/{x}/{y}.png'],
      type: 'raster',
      maxZoom: 18,
      attribution: '© OpenStreetMap'
    }
  ], []);

  // Optimized callback for location selection
  const pickLocation = useCallback(async (lng: number, lat: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-TW,zh,en`
      );
      const data = await response.json();
      const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      onLocationSelect?.({ latitude: lat, longitude: lng, address });
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      onLocationSelect?.({
        latitude: lat,
        longitude: lng,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      });
    }
  }, [onLocationSelect]);

  // Optimized pin creation/movement
  const createOrMovePin = useCallback((lng: number, lat: number) => {
    if (!map.current) return;

    if (!pinMarkerRef.current) {
      // Create a more visible pin element
      const el = document.createElement('div');
      el.style.cssText = `
        width: 24px;
        height: 24px;
        background: hsl(0, 84%, 60%);
        border: 2px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        z-index: 1000;
      `;
      
      // Add inner dot for better visibility
      const innerDot = document.createElement('div');
      innerDot.style.cssText = `
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(45deg);
      `;
      el.appendChild(innerDot);
      
      const marker = new maplibregl.Marker({ 
        element: el, 
        draggable: true, 
        anchor: 'bottom',
        pitchAlignment: 'map',
        rotationAlignment: 'map'
      })
        .setLngLat([lng, lat])
        .addTo(map.current);
        
      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        pickLocation(pos.lng, pos.lat);
      });
      
      pinMarkerRef.current = marker;
    } else {
      pinMarkerRef.current.setLngLat([lng, lat]);
    }
  }, []);

  const clearPin = useCallback(() => {
    if (pinMarkerRef.current) {
      pinMarkerRef.current.remove();
      pinMarkerRef.current = null;
    }
  }, []);

  // Dynamic tile source switching without re-initialization
  const switchTileSource = useCallback((newIndex: number) => {
    if (!map.current || newIndex >= tileSources.length) return;
    
    const newSource = tileSources[newIndex];
    const tileUrls = Array.isArray(newSource.style) ? newSource.style : [newSource.style];
    const selectedTileUrl = tileUrls[0];
    
    try {
      const source = map.current.getSource('main-tiles') as maplibregl.RasterTileSource;
      if (source && source.setTiles) {
        source.setTiles([selectedTileUrl]);
        currentTileSource.current = newIndex;
        console.log(`🔄 Switched to tile source: ${newSource.name}`);
      }
    } catch (error) {
      console.error('Failed to switch tile source:', error);
    }
  }, [tileSources]);

  // Stable map initialization (only once)
  useEffect(() => {
    if (!mapContainer.current || map.current || initializationRef.current) return;
    
    initializationRef.current = true;

    const initializeMap = async () => {
      try {
        setMapError(null);
        
        // Use search location if available, otherwise default to Taiwan center
        const initialCenter: [number, number] = searchLocation 
          ? [searchLocation.longitude, searchLocation.latitude]
          : [120.9605, 23.6978];
        
        const currentSource = tileSources[currentTileSource.current];
        console.log(`🗺️ Initializing map with source: ${currentSource.name}`);
        
        // Select stable tile server
        const tileUrls = Array.isArray(currentSource.style) ? currentSource.style : [currentSource.style];
        const selectedTileUrl = tileUrls[0]; // Use first stable server instead of random
        
        const rasterStyle = {
          version: 8 as const,
          sources: {
            'main-tiles': {
              type: 'raster' as const,
              tiles: [selectedTileUrl],
              tileSize: 256,
              maxzoom: currentSource.maxZoom,
              attribution: currentSource.attribution
            }
          },
          layers: [{
            id: 'main-tiles',
            type: 'raster' as const,
            source: 'main-tiles',
            paint: { 'raster-fade-duration': 300 }
          }]
        };
        
        map.current = new maplibregl.Map({
          container: mapContainer.current!,
          style: rasterStyle,
          center: initialCenter,
          zoom: searchLocation ? 12 : 8,
          maxZoom: currentSource.maxZoom,
          minZoom: 6,
          attributionControl: false
        });

        // Simplified error handling with dynamic switching
        map.current.on('error', (e) => {
          console.error('Map error:', e);
          if (currentTileSource.current < tileSources.length - 1) {
            const nextIndex = currentTileSource.current + 1;
            console.log(`🔄 Switching to backup tile source: ${tileSources[nextIndex].name}`);
            switchTileSource(nextIndex);
          } else {
            setMapError('地圖載入失敗，請重試');
          }
        });

        // Add navigation controls
        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');
        map.current.addControl(new maplibregl.AttributionControl({
          compact: true
        }), 'bottom-right');

        map.current.on('load', () => {
          console.log(`✅ Map loaded successfully with ${currentSource.name}`);
          // Add persistent sources and layers once
          if (!map.current?.getSource('search-point')) {
            map.current?.addSource('search-point', {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] }
            });
          }

          if (!map.current?.getLayer('search-point-circle')) {
            map.current?.addLayer({
              id: 'search-point-circle',
              type: 'circle',
              source: 'search-point',
              paint: {
                'circle-radius': 6,
                'circle-color': 'hsl(16, 90%, 55%)',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2,
                'circle-opacity': 0.95
              }
            });
          }

          if (!map.current?.getSource('search-radius')) {
            map.current?.addSource('search-radius', {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] }
            });
          }

          if (!map.current?.getLayer('search-radius-fill')) {
            map.current?.addLayer({
              id: 'search-radius-fill',
              type: 'fill',
              source: 'search-radius',
              paint: {
                'fill-color': 'hsl(208, 80%, 50%)',
                'fill-opacity': 0.2
              }
            });
          }

          if (!map.current?.getLayer('search-radius-border')) {
            map.current?.addLayer({
              id: 'search-radius-border',
              type: 'line',
              source: 'search-radius',
              paint: {
                'line-color': 'hsl(16, 90%, 50%)',
                'line-width': 2,
                'line-opacity': 0.8
              }
            });
          }

          // Hotspots source & layers
          if (!map.current?.getSource('hotspots')) {
            map.current?.addSource('hotspots', {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] }
            });
          }

          if (!map.current?.getLayer('hotspots-heat')) {
            map.current?.addLayer({
              id: 'hotspots-heat',
              type: 'heatmap',
              source: 'hotspots',
              maxzoom: 22,
              paint: {
                'heatmap-weight': ['coalesce', ['get', 'weight'], 0.5],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 2],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 16, 14, 32],
                'heatmap-color': [
                  'interpolate', ['linear'], ['heatmap-density'],
                  0, 'rgba(0,0,0,0)',
                  0.2, 'hsl(208, 80%, 70%)',
                  0.4, 'hsl(200, 80%, 55%)',
                  0.6, 'hsl(40, 95%, 55%)',
                  0.8, 'hsl(16, 90%, 50%)',
                  1, 'hsl(0, 85%, 45%)'
                ],
                'heatmap-opacity': 0.7
              }
            });
          }

          if (!map.current?.getLayer('hotspots-circle')) {
            map.current?.addLayer({
              id: 'hotspots-circle',
              type: 'circle',
              source: 'hotspots',
              minzoom: 12,
              paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 16, 8],
                'circle-color': 'hsl(16, 90%, 55%)',
                'circle-stroke-color': '#fff',
                'circle-stroke-width': 1,
                'circle-opacity': 0.85
              }
            });
          }

          setMapLoaded(true);
        });

        // Handle map clicks for location selection and pin placement
        map.current.on('click', async (e) => {
          const { lng, lat } = e.lngLat;
          
          // Create or move pin to clicked location
          createOrMovePin(lng, lat);
          
          // Also trigger location search
          pickLocation(lng, lat);
        });

      } catch (error) {
        console.error('Failed to initialize map:', error);
        setMapError('地圖初始化失敗');
      }
    };

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      initializationRef.current = false;
    };
  }, []); // Remove dependencies to prevent re-initialization

  // Update map when search location or radius changes using persistent sources
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const pointSource = map.current.getSource('search-point') as maplibregl.GeoJSONSource | undefined;
    const radiusSource = map.current.getSource('search-radius') as maplibregl.GeoJSONSource | undefined;

    if (!pointSource || !radiusSource) return;

    if (!searchLocation) {
      // Clear sources and popup when no location
      pointSource.setData({ type: 'FeatureCollection', features: [] } as any);
      radiusSource.setData({ type: 'FeatureCollection', features: [] } as any);
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      return;
    }

    // Update point feature
    const pointFeature: GeoJSON.Feature<GeoJSON.Point> = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [searchLocation.longitude, searchLocation.latitude]
      },
      properties: {}
    };
    pointSource.setData(pointFeature as any);

    // Update radius polygon
    const radiusInKm = searchRadius / 1000;
    const radiusCircle = createCircle([searchLocation.longitude, searchLocation.latitude], radiusInKm);
    radiusSource.setData(radiusCircle as any);

    // Stable popup (single instance)
    if (!popupRef.current) {
      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12
      });
    }
    popupRef.current
      .setLngLat([searchLocation.longitude, searchLocation.latitude])
      .setHTML(`<div style="padding:8px;font-size:12px;max-width:220px;">${searchLocation.address}</div>`) 
      .addTo(map.current);

    // Fit bounds after the style becomes idle to avoid flicker
    const bounds = new maplibregl.LngLatBounds();
    const buffer = radiusInKm / 111 * 2;
    bounds.extend([
      searchLocation.longitude - buffer,
      searchLocation.latitude - buffer
    ]);
    bounds.extend([
      searchLocation.longitude + buffer,
      searchLocation.latitude + buffer
    ]);

    const fit = () => {
      map.current?.fitBounds(bounds, {
        padding: 50,
        duration: 700,
        maxZoom: 14
      });
    };

    if (map.current.isMoving()) {
      map.current.once('idle', fit);
    } else {
      fit();
    }
  }, [searchLocation, searchRadius, mapLoaded]);

  // Update hotspots when points change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const hotspots = map.current.getSource('hotspots') as maplibregl.GeoJSONSource | undefined;
    if (!hotspots) return;

    const features = (heatmapPoints || []).map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
      properties: { weight: p.weight ?? 0.6 }
    }));

    hotspots.setData({ type: 'FeatureCollection', features } as any);
  }, [heatmapPoints, mapLoaded]);

  // Sync pin position when external search location changes (if pin exists)
  useEffect(() => {
    if (!searchLocation || !pinMarkerRef.current) return;
    pinMarkerRef.current.setLngLat([searchLocation.longitude, searchLocation.latitude]);
  }, [searchLocation]);

  // Function to create a circle polygon
  const createCircle = (center: [number, number], radiusInKm: number, points = 64) => {
    const coords = [];
    const distanceX = radiusInKm / (111.32 * Math.cos((center[1] * Math.PI) / 180));
    const distanceY = radiusInKm / 110.54;

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      const x = distanceX * Math.cos(theta);
      const y = distanceY * Math.sin(theta);
      coords.push([center[0] + x, center[1] + y]);
    }
    coords.push(coords[0]);

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [coords]
      },
      properties: {}
    };
  };

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden shadow-map border border-border">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Simplified loading state */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <div className="text-muted-foreground">載入地圖中...</div>
            <div className="text-xs text-muted-foreground">
              {tileSources[currentTileSource.current].name}
            </div>
          </div>
        </div>
      )}
      
      {/* Simplified error state */}
      {mapError && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="text-destructive text-sm">⚠️ {mapError}</div>
            <button 
              onClick={() => {
                setMapError(null);
                currentTileSource.current = 0;
                setMapLoaded(false);
                initializationRef.current = false;
                if (map.current) {
                  map.current.remove();
                  map.current = null;
                }
              }}
              className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
            >
              重新載入
            </button>
          </div>
        </div>
      )}
      
      {/* Info display: top-left */}
      {mapLoaded && (
        <div className="absolute top-2 left-2 z-20">
          <div className="bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-medium border border-border shadow-card">
            {searchLocation ? `搜尋半徑: ${searchRadius}m` : '點擊地圖放置圖釘'}
          </div>
        </div>
      )}
    </div>
  );
};

// Memoized export to prevent unnecessary re-renders
export const FloodRiskMap = React.memo(FloodRiskMapComponent, (prevProps, nextProps) => {
  return (
    prevProps.searchRadius === nextProps.searchRadius &&
    prevProps.searchLocation?.latitude === nextProps.searchLocation?.latitude &&
    prevProps.searchLocation?.longitude === nextProps.searchLocation?.longitude &&
    prevProps.searchLocation?.address === nextProps.searchLocation?.address &&
    prevProps.heatmapPoints === nextProps.heatmapPoints &&
    prevProps.onLocationSelect === nextProps.onLocationSelect
  );
});