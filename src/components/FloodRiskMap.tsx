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

    function addSearchLocationToMap() {
      if (!map.current || !searchLocation) return;

      // Clear existing layers and sources
      try {
        if (map.current.getLayer('search-point-label')) {
          map.current.removeLayer('search-point-label');
        }
        if (map.current.getLayer('search-point')) {
          map.current.removeLayer('search-point');
        }
        if (map.current.getLayer('search-point-pulse')) {
          map.current.removeLayer('search-point-pulse');
        }
        if (map.current.getLayer('search-radius')) {
          map.current.removeLayer('search-radius');
        }
        if (map.current.getSource('search-location')) {
          map.current.removeSource('search-location');
        }
        if (map.current.getSource('search-radius')) {
          map.current.removeSource('search-radius');
        }
      } catch (error) {
        console.log('Error removing existing sources:', error);
      }

      // Add search location marker with enhanced visibility
      map.current.addSource('search-location', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [searchLocation.longitude, searchLocation.latitude]
          },
          properties: {
            name: searchLocation.address
          }
        }
      });

      // Add pulsing animation layer (background circle)
      map.current.addLayer({
        id: 'search-point-pulse',
        type: 'circle',
        source: 'search-location',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 20,
            15, 40,
            20, 80
          ],
          'circle-color': 'hsl(0, 70%, 50%)',
          'circle-opacity': 0.4,
          'circle-stroke-width': 0
        }
      });

      // Add main marker (foreground circle)
      map.current.addLayer({
        id: 'search-point',
        type: 'circle',
        source: 'search-location',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 10,
            15, 18,
            20, 30
          ],
          'circle-color': 'hsl(0, 85%, 60%)',
          'circle-stroke-width': 4,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.9
        }
      });

      // Add address label
      map.current.addLayer({
        id: 'search-point-label',
        type: 'symbol',
        source: 'search-location',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular'],
          'text-size': 14,
          'text-offset': [0, -3],
          'text-anchor': 'bottom',
          'text-max-width': 10
        },
        paint: {
          'text-color': 'hsl(0, 0%, 10%)',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
          'text-halo-blur': 1
        }
      });

      // Add radius circle
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
          'fill-opacity': 0.2
        }
      });

      // Fit map to show the radius with better stability
      const bounds = new maplibregl.LngLatBounds();
      const buffer = radiusInKm / 111 * 1.2; // Add 20% buffer for better view
      bounds.extend([
        searchLocation.longitude - buffer,
        searchLocation.latitude - buffer
      ]);
      bounds.extend([
        searchLocation.longitude + buffer,
        searchLocation.latitude + buffer
      ]);
      
      // Use setTimeout to ensure the layers are fully rendered before fitting bounds
      setTimeout(() => {
        map.current?.fitBounds(bounds, { 
          padding: 80,
          duration: 1000,
          essential: true // Prevents other animations from cancelling this one
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
      {!mapLoaded && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-muted-foreground">載入地圖中...</div>
        </div>
      )}
    </div>
  );
};