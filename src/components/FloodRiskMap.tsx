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

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize MapLibre GL JS with OpenFreeMap
    // Use search location if available, otherwise default to Taiwan center
    const initialCenter: [number, number] = searchLocation 
      ? [searchLocation.longitude, searchLocation.latitude]
      : [120.9605, 23.6978]; // Taiwan center instead of Taipei
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/positron', // Light style
      center: initialCenter,
      zoom: searchLocation ? 12 : 8, // Closer zoom if we have a search location
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add scale control
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    map.current.on('load', () => {
      setMapLoaded(true);
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

    return () => {
      map.current?.remove();
    };
  }, [onLocationSelect]);

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
      const layersToRemove = ['search-point-label', 'search-point', 'search-point-pulse', 'search-radius'];
      const sourcesToRemove = ['search-location', 'search-radius'];

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

      // Add radius visualization using GeoJSON
      try {
        const radiusInKm = searchRadius / 1000;
        const radiusCircle = createCircle([searchLocation.longitude, searchLocation.latitude], radiusInKm);
        
        map.current.addSource('search-radius', {
          type: 'geojson',
          data: radiusCircle
        });

        map.current.addLayer({
          id: 'search-radius',
          type: 'fill',
          source: 'search-radius',
          paint: {
            'fill-color': 'hsl(208, 90%, 45%)',
            'fill-opacity': 0.15
          }
        });

        console.log('✅ Added search radius circle');
      } catch (error) {
        console.error('❌ Error adding radius circle:', error);
      }

      // Fit map to show the location and radius with improved timing
      const radiusInKm = searchRadius / 1000;
      const bounds = new maplibregl.LngLatBounds();
      const buffer = Math.max(radiusInKm / 111 * 1.5, 0.01); // Minimum buffer for visibility
      
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
          map.current?.fitBounds(bounds, { 
            padding: 80,
            duration: attempts === 0 ? 1000 : 500,
            essential: true
          });
          console.log(`✅ Fitted bounds (attempt ${attempts + 1})`);
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
      {!mapLoaded && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-muted-foreground">載入地圖中...</div>
        </div>
      )}
    </div>
  );
};