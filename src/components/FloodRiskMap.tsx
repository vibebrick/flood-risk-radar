import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface FloodRiskMapProps {
  searchLocation?: { latitude: number; longitude: number; address: string };
  searchRadius: number;
  onLocationSelect?: (location: { latitude: number; longitude: number; address: string }) => void;
}

export const FloodRiskMap: React.FC<FloodRiskMapProps> = ({
  searchLocation,
  searchRadius,
  onLocationSelect
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tileSourceIndex, setTileSourceIndex] = useState(0);

  // Multiple reliable tile sources with load balancing
  const tileSources = [
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
  ];


  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initializeMap = async () => {
      try {
        setMapError(null);
        
        // Use search location if available, otherwise default to Taiwan center
        const initialCenter: [number, number] = searchLocation 
          ? [searchLocation.longitude, searchLocation.latitude]
          : [120.9605, 23.6978];
        
        const currentSource = tileSources[tileSourceIndex];
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
            source: 'main-tiles'
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

        // Simplified error handling
        map.current.on('error', (e) => {
          console.error('Map error:', e);
          if (tileSourceIndex < tileSources.length - 1) {
            console.log(`🔄 Switching to backup tile source: ${tileSources[tileSourceIndex + 1].name}`);
            setTileSourceIndex(prev => prev + 1);
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
          setMapLoaded(true);
        });

        // Handle map clicks for location selection
        map.current.on('click', async (e) => {
          const { lng, lat } = e.lngLat;
          
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-TW,zh,en`
            );
            const data = await response.json();
            
            const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            
            onLocationSelect?.({
              latitude: lat,
              longitude: lng,
              address: address
            });
          } catch (error) {
            console.error('Error reverse geocoding:', error);
            onLocationSelect?.({
              latitude: lat,
              longitude: lng,
              address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            });
          }
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
    };
  }, [onLocationSelect, tileSourceIndex]);

  // Simplified marker management
  const [markerRef, setMarkerRef] = useState<maplibregl.Marker | null>(null);
  
  // Update map when search location changes
  useEffect(() => {
    if (!map.current || !searchLocation || !mapLoaded) return;

    // Clean up previous marker
    if (markerRef) {
      markerRef.remove();
      setMarkerRef(null);
    }

    console.log('🗺️ Adding marker for:', searchLocation);
    
    // Wait for map to be ready then add marker
    const addMarker = () => {
      if (map.current?.isStyleLoaded()) {
        addSearchLocationToMap();
      } else {
        setTimeout(addMarker, 100);
      }
    };

    addMarker();

    function addSearchLocationToMap() {
      if (!map.current || !searchLocation) return;

      console.log('🗺️ Adding marker and radius for:', searchLocation);

      // Clean up existing layers
      const layersToRemove = ['search-radius-fill', 'search-radius-border', 'radius-label'];
      const sourcesToRemove = ['search-radius', 'radius-label'];

      layersToRemove.forEach(layerId => {
        if (map.current?.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
      });

      sourcesToRemove.forEach(sourceId => {
        if (map.current?.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
      });

      // Create simple, stable marker
      const markerElement = document.createElement('div');
      markerElement.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: hsl(16, 90%, 55%);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        z-index: 1000;
      `;

      // Create marker
      const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: 'center'
      })
        .setLngLat([searchLocation.longitude, searchLocation.latitude])
        .addTo(map.current);

      setMarkerRef(marker);

      // Add popup
      const popup = new maplibregl.Popup({
        offset: 15,
        closeButton: false
      }).setHTML(`
        <div style="padding: 8px; font-size: 12px; max-width: 200px;">
          ${searchLocation.address}
        </div>
      `);

      marker.setPopup(popup);

      // Add radius circle
      const radiusInKm = searchRadius / 1000;
      const radiusCircle = createCircle([searchLocation.longitude, searchLocation.latitude], radiusInKm);
      
      map.current.addSource('search-radius', {
        type: 'geojson',
        data: radiusCircle
      });

      map.current.addLayer({
        id: 'search-radius-fill',
        type: 'fill',
        source: 'search-radius',
        paint: {
          'fill-color': 'hsl(208, 80%, 50%)',
          'fill-opacity': 0.2
        }
      });

      map.current.addLayer({
        id: 'search-radius-border',
        type: 'line',
        source: 'search-radius',
        paint: {
          'line-color': 'hsl(16, 90%, 50%)',
          'line-width': 2,
          'line-opacity': 0.8
        }
      });

      console.log('✅ Added marker and radius');

      // Fit map bounds
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
      
      setTimeout(() => {
        map.current?.fitBounds(bounds, { 
          padding: 50,
          duration: 800,
          maxZoom: 14
        });
      }, 100);
    }
  }, [searchLocation, searchRadius, mapLoaded]);

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
              {tileSources[tileSourceIndex].name}
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
                setTileSourceIndex(0);
                setMapLoaded(false);
              }}
              className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
            >
              重新載入
            </button>
          </div>
        </div>
      )}
      
      {/* Radius indicator in top-left */}
      {mapLoaded && searchLocation && (
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-medium border border-border/50">
          搜尋半徑: {searchRadius}m
        </div>
      )}
    </div>
  );
};