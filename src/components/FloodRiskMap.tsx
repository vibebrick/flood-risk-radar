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

  const [retryCount, setRetryCount] = useState(0);
  const [tileLoadProgress, setTileLoadProgress] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

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
        console.log(`🗺️ Initializing map with source: ${currentSource.name}`);
        
        // Select random tile server for load balancing
        const tileUrls = Array.isArray(currentSource.style) ? currentSource.style : [currentSource.style];
        const selectedTileUrl = tileUrls[Math.floor(Math.random() * tileUrls.length)];
        
        // Create enhanced raster style with retry mechanism
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

        // Enhanced error handling with intelligent retry
        map.current.on('error', (e) => {
          console.error('Map error:', e);
          setIsRetrying(true);
          
          if (retryCount < 3) {
            // Retry with same source first
            console.log(`🔄 Retrying with ${currentSource.name} (attempt ${retryCount + 1})`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              setIsRetrying(false);
            }, Math.pow(2, retryCount) * 1000); // Exponential backoff
          } else if (tileSourceIndex < tileSources.length - 1) {
            // Switch to next tile source
            console.log(`🔄 Switching to backup tile source: ${tileSources[tileSourceIndex + 1].name}`);
            setTileSourceIndex(prev => prev + 1);
            setRetryCount(0);
            setIsRetrying(false);
          } else {
            setMapError('所有地圖源均載入失敗，請檢查網路連線後重試');
            setIsRetrying(false);
          }
        });

        // Monitor tile loading progress
        let loadedTiles = 0;
        let totalTiles = 0;

        map.current.on('dataloading', (e: any) => {
          if (e.sourceId === 'main-tiles') {
            totalTiles++;
            setTileLoadProgress(Math.round((loadedTiles / Math.max(totalTiles, 1)) * 100));
          }
        });

        map.current.on('data', (e: any) => {
          if (e.sourceId === 'main-tiles' && e.isSourceLoaded) {
            loadedTiles++;
            setTileLoadProgress(Math.round((loadedTiles / Math.max(totalTiles, 1)) * 100));
          }
        });

        // Handle individual tile errors with retry
        map.current.on('sourcedataloading', (e: any) => {
          if (e.sourceId === 'main-tiles') {
            // Monitor for tile load failures and implement per-tile retry if needed
            console.log('🗺️ Loading tiles...');
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
          console.log(`✅ Map loaded successfully with ${currentSource.name}`);
          setMapLoaded(true);
          setTileLoadProgress(100);
          setRetryCount(0);
        });

        map.current.on('idle', () => {
          console.log('✅ Map is idle and ready');
          setTileLoadProgress(100);
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
  }, [onLocationSelect, tileSourceIndex, retryCount]);

  // Enhanced search location marker management with loading checks
  const [markerRef, setMarkerRef] = useState<maplibregl.Marker | null>(null);
  const [markerAddAttempts, setMarkerAddAttempts] = useState(0);
  
  // Update map when search location changes
  useEffect(() => {
    if (!map.current || !searchLocation) return;

    // Clean up previous marker
    if (markerRef) {
      markerRef.remove();
      setMarkerRef(null);
    }

    console.log('🗺️ Search location changed, adding marker:', searchLocation);

    // Enhanced loading check with multiple validation points
    const addMarkerWhenReady = () => {
      if (!map.current || !searchLocation) {
        console.log('❌ Map or search location not available');
        return;
      }

      const isMapReady = map.current.isStyleLoaded() && mapLoaded;
      console.log('🔍 Map readiness check:', {
        isStyleLoaded: map.current.isStyleLoaded(),
        mapLoaded,
        isMapReady,
        attempts: markerAddAttempts
      });

      if (isMapReady) {
        addSearchLocationToMap();
      } else if (markerAddAttempts < 5) {
        console.log(`⏳ Map not ready, retrying in ${Math.pow(2, markerAddAttempts) * 100}ms (attempt ${markerAddAttempts + 1})`);
        setMarkerAddAttempts(prev => prev + 1);
        setTimeout(addMarkerWhenReady, Math.pow(2, markerAddAttempts) * 100);
      } else {
        console.error('❌ Failed to add marker after maximum attempts');
      }
    };

    // Reset attempt counter and start the process
    setMarkerAddAttempts(0);
    
    // If map is already ready, add immediately; otherwise wait
    if (map.current.isStyleLoaded() && mapLoaded) {
      addSearchLocationToMap();
    } else {
      // Listen for both style load and map load events
      const onStyleLoad = () => {
        console.log('✅ Style loaded, attempting to add marker');
        addMarkerWhenReady();
      };
      
      map.current.once('style.load', onStyleLoad);
      map.current.once('idle', onStyleLoad);
      
      // Also try after a short delay as fallback
      setTimeout(addMarkerWhenReady, 500);
    }

    async function addSearchLocationToMap() {
      if (!map.current || !searchLocation) {
        console.log('❌ Map or search location not available');
        return;
      }

      console.log('🗺️ Adding search location to map:', {
        location: searchLocation,
        mapLoaded: map.current.isStyleLoaded(),
        searchRadius,
        mapCenter: map.current.getCenter(),
        mapZoom: map.current.getZoom()
      });

      // Enhanced cleanup of existing marker and layers
      if (markerRef) {
        markerRef.remove();
        setMarkerRef(null);
        console.log('✅ Removed previous marker');
      }

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

      // Create enhanced HTML marker with maximum visibility
      const markerElement = document.createElement('div');
      markerElement.className = 'search-location-marker';
      markerElement.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: hsl(16, 90%, 55%);
        border: 5px solid white;
        box-shadow: 
          0 6px 16px rgba(0,0,0,0.4), 
          0 0 0 6px hsla(16, 90%, 55%, 0.4),
          inset 0 2px 4px rgba(255,255,255,0.3);
        cursor: pointer;
        position: relative;
        z-index: 1000;
        animation: searchPulse 2s infinite;
        transform: translate(-50%, -50%);
      `;

      // Enhanced animation with unique name to avoid conflicts
      const animationId = 'search-marker-' + Date.now();
      const style = document.createElement('style');
      style.id = animationId;
      style.textContent = `
        @keyframes searchPulse {
          0% { 
            box-shadow: 
              0 6px 16px rgba(0,0,0,0.4), 
              0 0 0 6px hsla(16, 90%, 55%, 0.4),
              inset 0 2px 4px rgba(255,255,255,0.3);
            transform: translate(-50%, -50%) scale(1);
          }
          50% { 
            box-shadow: 
              0 6px 16px rgba(0,0,0,0.4), 
              0 0 0 20px hsla(16, 90%, 55%, 0.1),
              inset 0 2px 4px rgba(255,255,255,0.3);
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% { 
            box-shadow: 
              0 6px 16px rgba(0,0,0,0.4), 
              0 0 0 6px hsla(16, 90%, 55%, 0.4),
              inset 0 2px 4px rgba(255,255,255,0.3);
            transform: translate(-50%, -50%) scale(1);
          }
        }
        .search-location-marker {
          animation: searchPulse 2s infinite;
        }
      `;
      
      // Remove any existing animation styles
      const existingStyles = document.querySelectorAll('style[id^="search-marker-"]');
      existingStyles.forEach(s => s.remove());
      document.head.appendChild(style);

      // Create and add HTML marker with enhanced positioning
      const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: 'center',
        offset: [0, 0]
      })
        .setLngLat([searchLocation.longitude, searchLocation.latitude])
        .addTo(map.current);

      // Store marker reference for proper cleanup
      setMarkerRef(marker);

      console.log('✅ Enhanced marker added successfully at:', {
        coordinates: [searchLocation.longitude, searchLocation.latitude],
        element: markerElement,
        visible: markerElement.offsetParent !== null
      });

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

      // Verify marker is visible after adding
      setTimeout(() => {
        if (markerElement.offsetParent === null) {
          console.warn('⚠️ Marker may not be visible, attempting to force display');
          markerElement.style.display = 'block';
          markerElement.style.position = 'absolute';
          markerElement.style.zIndex = '1000';
        }
      }, 100);
    }
  }, [searchLocation, searchRadius, mapLoaded, markerRef]);

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
      
      {/* Enhanced loading state with progress */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <div className="text-muted-foreground">
                {isRetrying ? `重試中... (${retryCount + 1}/3)` : '載入地圖中...'}
              </div>
            </div>
            {tileLoadProgress > 0 && tileLoadProgress < 100 && (
              <div className="w-32 mx-auto">
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${tileLoadProgress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {tileLoadProgress}%
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              使用: {tileSources[tileSourceIndex].name}
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced error state */}
      {mapError && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="text-destructive text-sm">⚠️ {mapError}</div>
            <div className="text-xs text-muted-foreground">
              已嘗試 {tileSources.length} 個地圖源
            </div>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => {
                  setMapError(null);
                  setTileSourceIndex(0);
                  setRetryCount(0);
                  setTileLoadProgress(0);
                  setMapLoaded(false);
                }}
                className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
              >
                重新載入
              </button>
              <button 
                onClick={() => {
                  setMapError(null);
                  setTileSourceIndex((prev) => (prev + 1) % tileSources.length);
                  setRetryCount(0);
                  setTileLoadProgress(0);
                  setMapLoaded(false);
                }}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/90"
              >
                切換地圖源
              </button>
            </div>
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