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

  // Reliable tile sources with proper fallback
  const tileSources = [
    {
      style: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      type: 'raster'
    },
    {
      style: 'https://tiles.wmflabs.org/osm-no-labels/{z}/{x}/{y}.png',
      type: 'raster'
    },
    {
      style: 'https://tiles.openfreemap.org/styles/positron',
      type: 'style'
    }
  ];

  useEffect(() => {
    if (!mapContainer.current) return;

    const initializeMap = async () => {
      try {
        setMapError(null);
        
        // Use search location if available, otherwise default to Taiwan center
        const initialCenter: [number, number] = searchLocation 
          ? [searchLocation.longitude, searchLocation.latitude]
          : [120.9605, 23.6978];
        
        const currentSource = tileSources[tileSourceIndex];
        
        if (currentSource.type === 'raster') {
          // Create a basic style for raster sources
          const rasterStyle = {
            version: 8 as const,
            sources: {
              'osm': {
                type: 'raster' as const,
                tiles: [currentSource.style],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
              }
            },
            layers: [{
              id: 'osm',
              type: 'raster' as const,
              source: 'osm'
            }]
          };
          
          map.current = new maplibregl.Map({
            container: mapContainer.current!,
            style: rasterStyle,
            center: initialCenter,
            zoom: searchLocation ? 12 : 8,
            maxZoom: 18,
            minZoom: 6,
            attributionControl: false
          });
        } else {
          map.current = new maplibregl.Map({
            container: mapContainer.current!,
            style: currentSource.style,
            center: initialCenter,
            zoom: searchLocation ? 12 : 8,
            maxZoom: 18,
            minZoom: 6,
            attributionControl: false
          });
        }

        // Error handling for style loading
        map.current.on('error', (e) => {
          console.error('Map error:', e);
          if (tileSourceIndex < tileSources.length - 1) {
            console.log(`Switching to backup tile source ${tileSourceIndex + 1}`);
            setTileSourceIndex(prev => prev + 1);
          } else {
            setMapError('地圖載入失敗，請檢查網路連線');
          }
        });

        // Add navigation controls
        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        // Add scale control
        map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');

        // Add attribution control
        map.current.addControl(new maplibregl.AttributionControl({
          compact: true
        }), 'bottom-right');

        map.current.on('load', () => {
          console.log('✅ Map loaded successfully');
          setMapLoaded(true);
        });

        map.current.on('idle', () => {
          console.log('✅ Map is idle and ready');
        });

        // Handle map clicks for location selection
        map.current.on('click', async (e) => {
          const { lng, lat } = e.lngLat;
          
          try {
            // Reverse geocoding using Nominatim
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
      map.current?.remove();
    };
  }, [onLocationSelect, tileSourceIndex]);

  // Update map when search location changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !searchLocation) return;

    // Ensure style is loaded before adding sources
    if (!map.current.isStyleLoaded()) {
      // Wait for style to load if not ready
      map.current.once('style.load', () => {
        addSearchLocationToMap();
      });
      return;
    }

    addSearchLocationToMap();

    async function addSearchLocationToMap() {
      if (!map.current || !searchLocation) {
        console.log('❌ Map or search location not available');
        return;
      }

      console.log('🗺️ Adding search location to map:', {
        location: searchLocation,
        mapLoaded: map.current.isStyleLoaded(),
        searchRadius
      });

      // Clear existing layers and sources with improved error handling
      const layersToRemove = ['search-point-label', 'search-point', 'search-point-pulse', 'search-radius-fill', 'search-radius-border', 'radius-label'];
      const sourcesToRemove = ['search-location', 'search-radius', 'radius-label'];

      try {
        layersToRemove.forEach(layerId => {
          if (map.current?.getLayer(layerId)) {
            map.current.removeLayer(layerId);
            console.log(`✅ Removed layer: ${layerId}`);
          }
        });

        sourcesToRemove.forEach(sourceId => {
          if (map.current?.getSource(sourceId)) {
            map.current.removeSource(sourceId);
            console.log(`✅ Removed source: ${sourceId}`);
          }
        });
      } catch (error) {
        console.log('⚠️ Error removing existing sources:', error);
      }

      // Add HTML marker as primary solution with enhanced visibility
      const markerElement = document.createElement('div');
      markerElement.style.cssText = `
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: hsl(16, 90%, 55%);
        border: 4px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 0 4px hsla(16, 90%, 55%, 0.3);
        cursor: pointer;
        position: relative;
        animation: pulse 2s infinite;
      `;

      // Add pulsing animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0% { box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 0 4px hsla(16, 90%, 55%, 0.3); }
          50% { box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 0 12px hsla(16, 90%, 55%, 0.1); }
          100% { box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 0 4px hsla(16, 90%, 55%, 0.3); }
        }
      `;
      document.head.appendChild(style);

      // Create and add HTML marker
      const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: 'center'
      })
        .setLngLat([searchLocation.longitude, searchLocation.latitude])
        .addTo(map.current);

      console.log('✅ Added HTML marker at:', [searchLocation.longitude, searchLocation.latitude]);

      // Add address popup
      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false
      }).setHTML(`
        <div style="
          padding: 8px 12px;
          background: white;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          font-size: 12px;
          max-width: 200px;
          word-wrap: break-word;
        ">
          ${searchLocation.address}
        </div>
      `);

      marker.setPopup(popup);
      
      // Show popup initially
      popup.addTo(map.current);

      // Add radius visualization using GeoJSON with enhanced visibility
      try {
        const radiusInKm = searchRadius / 1000;
        const radiusCircle = createCircle([searchLocation.longitude, searchLocation.latitude], radiusInKm);
        
        map.current.addSource('search-radius', {
          type: 'geojson',
          data: radiusCircle
        });

        // Add fill layer for radius area with enhanced visibility
        map.current.addLayer({
          id: 'search-radius-fill',
          type: 'fill',
          source: 'search-radius',
          paint: {
            'fill-color': 'hsl(208, 80%, 50%)',
            'fill-opacity': 0.35
          }
        });

        // Add border layer for radius circle with increased visibility
        map.current.addLayer({
          id: 'search-radius-border',
          type: 'line',
          source: 'search-radius',
          paint: {
            'line-color': 'hsl(16, 95%, 50%)',
            'line-width': 4,
            'line-opacity': 0.9
          }
        });

        // Add radius label
        const centerPoint = {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [searchLocation.longitude, searchLocation.latitude + radiusInKm / 111]
          },
          properties: {
            radius: `${searchRadius}m`
          }
        };

        map.current.addSource('radius-label', {
          type: 'geojson',
          data: centerPoint
        });

        map.current.addLayer({
          id: 'radius-label',
          type: 'symbol',
          source: 'radius-label',
          layout: {
            'text-field': ['get', 'radius'],
            'text-font': ['Open Sans Regular'],
            'text-size': 12,
            'text-anchor': 'center',
            'text-offset': [0, 0]
          },
          paint: {
            'text-color': 'hsl(16, 90%, 40%)',
            'text-halo-color': 'white',
            'text-halo-width': 2
          }
        });

        console.log('✅ Added enhanced search radius circle with border and label');
      } catch (error) {
        console.error('❌ Error adding radius circle:', error);
      }

      // Fit map to show the location and radius with dynamic zoom adjustment
      const radiusInKm = searchRadius / 1000;
      const bounds = new maplibregl.LngLatBounds();
      
          // Enhanced dynamic buffer calculation based on radius size
      let buffer;
      if (radiusInKm <= 0.3) {
        buffer = radiusInKm / 111 * 4; // Maximum zoom for 300m
      } else if (radiusInKm <= 0.5) {
        buffer = radiusInKm / 111 * 3.5; // High zoom for 500m
      } else if (radiusInKm <= 0.8) {
        buffer = radiusInKm / 111 * 3; // Medium zoom for 800m
      } else {
        buffer = radiusInKm / 111 * 2.5; // Standard zoom for larger radius
      }
      buffer = Math.max(buffer, 0.003); // Minimum buffer
      
      bounds.extend([
        searchLocation.longitude - buffer,
        searchLocation.latitude - buffer
      ]);
      bounds.extend([
        searchLocation.longitude + buffer,
        searchLocation.latitude + buffer
      ]);
      
      // Multiple attempts to ensure fitBounds works
      const fitBoundsWithRetry = (attempts = 0) => {
        if (attempts > 3) {
          console.log('❌ Failed to fit bounds after multiple attempts');
          return;
        }

        try {
          // Enhanced dynamic padding and zoom based on radius
          const padding = Math.min(Math.max(30, radiusInKm * 8), 100);
          let maxZoom;
          if (radiusInKm <= 0.3) maxZoom = 16;
          else if (radiusInKm <= 0.5) maxZoom = 15;
          else if (radiusInKm <= 0.8) maxZoom = 14;
          else maxZoom = 13;
          
          map.current?.fitBounds(bounds, { 
            padding: padding,
            duration: attempts === 0 ? 1200 : 600,
            essential: true,
            maxZoom: maxZoom
          });
          console.log(`✅ Fitted bounds (attempt ${attempts + 1}) with radius ${searchRadius}m`);
        } catch (error) {
          console.log(`⚠️ Fit bounds attempt ${attempts + 1} failed:`, error);
          setTimeout(() => fitBoundsWithRetry(attempts + 1), 200);
        }
      };

      // Initial fit attempt
      setTimeout(() => fitBoundsWithRetry(), 200);

      // Store marker reference for cleanup
      if (map.current) {
        (map.current as any)._searchMarker = marker;
      }
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
      
      {/* Loading state */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <div className="text-muted-foreground">載入地圖中...</div>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {mapError && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center">
            <div className="text-destructive mb-2">⚠️ {mapError}</div>
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