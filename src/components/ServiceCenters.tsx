import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Phone, Star } from 'lucide-react';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'MY_GOOGLE_MAPS_KEY';

interface ServiceCentersProps {
  itemCategory: string;
}

export function ServiceCenters({ itemCategory }: ServiceCentersProps) {
  if (!hasValidKey) {
    return (
      <div className="px-6 py-8">
        <div className="p-6 bg-yellow-50 border border-yellow-100 rounded-3xl">
          <h4 className="text-sm font-bold text-yellow-800">Google Maps Belum Siap</h4>
          <p className="text-xs text-yellow-600 mt-2">
            Silakan tambahkan GOOGLE_MAPS_API_KEY di Secrets untuk melihat lokasi servis terdekat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Tempat Servis Terdekat</h3>
        <span className="text-xs text-secondary font-bold">Maps</span>
      </div>

      <div className="rounded-3xl overflow-hidden shadow-md h-72 border border-gray-100">
        <APIProvider apiKey={API_KEY}>
          <Map
            defaultCenter={{ lat: -6.2088, lng: 106.8456 }} // Jakarta base
            defaultZoom={11}
            mapId="RE_VIBE_MAP"
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          >
            <PlacesMarkers category={itemCategory} />
          </Map>
        </APIProvider>
      </div>
      
      <p className="text-[10px] text-gray-400 text-center italic">
        *Mencari tempat servis untuk kategori: {itemCategory}
      </p>
    </div>
  );
}

function PlacesMarkers({ category }: { category: string }) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [places, setPlaces] = useState<google.maps.places.PlaceResult[]>([]);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    if (!placesLib || !map) return;

    // Get current location if possible
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          map.setCenter(userLoc);
          map.setZoom(13);

          const svc = new google.maps.places.PlacesService(map);
          svc.nearbySearch({
            location: userLoc,
            radius: 5000,
            keyword: `service center ${category} perbaikan`
          }, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              setPlaces(results);
            }
          });
        },
        (error) => {
          console.error("Location error:", error);
          setLocError("Mohon izinkan akses lokasi untuk mencari tempat servis terdekat.");
        }
      );
    } else {
      setLocError("Browser kamu tidak mendukung pencarian lokasi.");
    }
  }, [placesLib, map, category]);

  if (locError) {
    return (
      <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
        <MapPin size={32} className="text-gray-400 mb-2" />
        <p className="text-xs text-gray-600 font-medium">{locError}</p>
      </div>
    );
  }

  return (
    <>
      {places.map((place, idx) => (
        <AdvancedMarker 
          key={place.place_id || idx} 
          position={place.geometry?.location as any}
          title={place.name}
        >
          <Pin background="#1A73E8" glyphColor="#fff" borderColor="#0d47a1" />
        </AdvancedMarker>
      ))}
    </>
  );
}
