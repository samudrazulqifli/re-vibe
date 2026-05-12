"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { TopBar } from '@/src/components/layout/TopBar';
import { useRouter } from 'next/navigation';
import { useReVibeStore } from '@/src/lib/store';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  useMap,
  Pin,
  MapCameraChangedEvent
} from '@vis.gl/react-google-maps';
import { 
  Navigation, 
  Star, 
  Phone, 
  MapPin, 
  Clock, 
  AlertCircle, 
  RefreshCcw,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY';

interface Place {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  userRatingsTotal: number;
  openNow: boolean | null;
  phoneNumber: string;
  distance: number;
}

export default function ServicePage() {
  const router = useRouter();
  const { recommendation } = useReVibeStore();
  
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [radius, setRadius] = useState(5000);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'nearby' | 'rating' | 'open'>('nearby');
  const [locationError, setLocationError] = useState<string | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const requestLocation = () => {
    setLocationError(null);
    setIsLoading(true);
    if (!("geolocation" in navigator)) {
      setLocationError('Browser tidak mendukung geolocation.');
      setIsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        const msg = error.code === error.PERMISSION_DENIED
          ? 'Izin lokasi ditolak. Aktifkan di setting browser lalu coba lagi.'
          : 'Tidak bisa mendapatkan lokasi GPS. Coba lagi atau perluas radius.';
        setLocationError(msg);
        toast.error(msg);
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Initial location request
  useEffect(() => {
    requestLocation();
  }, []);

  // Fetch places when location or radius changes
  useEffect(() => {
    if (userLocation) {
      fetchPlaces();
    }
  }, [userLocation, radius]);

  const fetchPlaces = async () => {
    if (!userLocation) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: userLocation.lat,
          lng: userLocation.lng,
          keyword: recommendation?.searchKeywords?.service || 'service center elektronik',
          radius: radius
        })
      });

      if (!response.ok) throw new Error('Gagal mengambil data tempat');
      
      const data = await response.json();
      setPlaces(data.places || []);
    } catch (err) {
      console.error('Fetch places error:', err);
      toast.error('Gagal mengambil data service center.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSearch = async () => {
    // Basic geocoding simulation or just alert
    // In a real app we'd use Geocoding API
    toast.error("Fitur pencarian alamat manual segera hadir. Gunakan lokasi otomatis browser.");
  };

  const filteredPlaces = useMemo(() => {
    let result = [...places];
    if (filter === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (filter === 'open') {
      result = result.filter(p => p.openNow === true);
    } else {
      result.sort((a, b) => a.distance - b.distance);
    }
    return result;
  }, [places, filter]);

  const handleSelectPlace = (place: Place) => {
    setSelectedPlaceId(place.placeId);
    // Pan map to place
    if (mapRef.current) {
      mapRef.current.panTo({ lat: place.lat, lng: place.lng });
      mapRef.current.setZoom(16);
    }
    // Scroll list into view if needed (handled by auto scroll logic usually)
  };

  const expandSearch = () => {
    setRadius(prev => prev * 2);
    toast.success("Memperluas radius pencarian...");
  };

  if (!hasValidKey) {
    return (
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-8 text-center min-h-screen">
        <div className="max-w-md flex flex-col gap-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <MapPin size={40} className="text-primary" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Google Maps API Key Diperlukan</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Halaman ini membutuhkan Google Maps API Key untuk menampilkan peta dan mencari service center.
          </p>
          <div className="bg-gray-50 p-6 rounded-[32px] text-left border border-gray-100">
            <h4 className="font-bold text-gray-900 mb-4">Cara menambahkan Key:</h4>
            <ol className="text-xs space-y-3 text-gray-600 list-decimal pl-4 font-medium">
              <li>Dapatkan API Key di Google Cloud Console</li>
              <li>Buka <b>Settings</b> (ikon gear di pojok kanan atas)</li>
              <li>Pilih <b>Secrets</b></li>
              <li>Tambah <code>GOOGLE_MAPS_API_KEY</code> dengan value API Key Anda</li>
            </ol>
          </div>
          <button 
            onClick={() => router.back()}
            className="w-full bg-gray-900 text-white font-black py-5 rounded-[24px]"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <div className="flex-1 bg-white flex flex-col h-screen overflow-hidden">
        <TopBar title="Service Center Terdekat" />
        
        {/* Top Half: Map */}
        <div className="h-[45%] relative">
          {!userLocation && !isLoading ? (
            <div className="h-full w-full bg-gray-100 flex flex-col items-center justify-center p-8 gap-5">
              <Navigation size={48} className="text-gray-300" />
              <div className="flex flex-col gap-2 text-center max-w-xs">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Membutuhkan Lokasi</p>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  {locationError ?? 'Izinkan akses lokasi di browser kamu agar kami bisa mencarikan service center terdekat.'}
                </p>
              </div>
              <button
                onClick={requestLocation}
                className="bg-primary text-white font-bold text-xs px-6 py-3 rounded-full shadow-lg active:scale-95 transition flex items-center gap-2"
              >
                <Navigation size={14} />
                Aktifkan Lokasi
              </button>
            </div>
          ) : (
            <Map
              defaultCenter={userLocation || { lat: -6.2088, lng: 106.8456 }} // Jakarta fallback
              defaultZoom={13}
              mapId="RE_VIBE_MAP"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              onCameraChanged={(ev: MapCameraChangedEvent) => {
                // mapRef.current = ev.map;
              }}
              style={{ width: '100%', height: '100%' }}
              className="h-full w-full"
            >
              {/* User Location Marker */}
              {userLocation && (
                <AdvancedMarker position={userLocation}>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-primary/20 animate-ping absolute -inset-0" />
                    <div className="w-6 h-6 rounded-full bg-primary border-4 border-white shadow-xl relative z-10" />
                  </div>
                </AdvancedMarker>
              )}

              {/* Service Center Markers */}
              {filteredPlaces.map(place => (
                <AdvancedMarker 
                  key={place.placeId} 
                  position={{ lat: place.lat, lng: place.lng }}
                  onClick={() => setSelectedPlaceId(place.placeId)}
                >
                  <Pin 
                    background={selectedPlaceId === place.placeId ? "#FF3B30" : "#007AFF"} 
                    glyphColor="#FFF" 
                    borderColor="#FFF"
                    scale={selectedPlaceId === place.placeId ? 1.2 : 1}
                  />
                </AdvancedMarker>
              ))}
            </Map>
          )}

          {/* Floating Filter Chips */}
          <div className="absolute bottom-4 left-0 right-0 px-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <FilterChip 
              label="Terdekat" 
              active={filter === 'nearby'} 
              onClick={() => setFilter('nearby')} 
            />
            <FilterChip 
              label="Rating" 
              active={filter === 'rating'} 
              onClick={() => setFilter('rating')} 
            />
            <FilterChip 
              label="Buka" 
              active={filter === 'open'} 
              onClick={() => setFilter('open')} 
            />
          </div>
        </div>

        {/* Bottom Half: List */}
        <div className="flex-1 bg-white rounded-t-[40px] -mt-8 relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
          <div className="p-6 flex flex-col gap-1">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Tersedia di Sekitarmu</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Ditemukan {filteredPlaces.length} Service Center
            </p>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-6 pb-12 space-y-4 no-scrollbar">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 w-full bg-gray-50 rounded-[32px] animate-pulse" />
                ))}
              </div>
            ) : filteredPlaces.length > 0 ? (
              filteredPlaces.map((place) => (
                <motion.div
                  key={place.placeId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleSelectPlace(place)}
                  className={cn(
                    "p-5 rounded-[32px] border transition-all flex items-center gap-4 cursor-pointer",
                    selectedPlaceId === place.placeId 
                      ? "bg-white border-primary shadow-lg shadow-primary/5 ring-1 ring-primary/20" 
                      : "bg-gray-50 border-gray-100"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    selectedPlaceId === place.placeId ? "bg-primary text-white" : "bg-white text-gray-400 shadow-sm"
                  )}>
                    <MapPin size={24} />
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-gray-900 truncate">{place.name}</h4>
                      <span className="text-[10px] font-black text-primary">{place.distance} km</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-accent fill-accent" />
                        <span className="text-[10px] font-bold text-gray-700">{place.rating}</span>
                        <span className="text-[10px] text-gray-400">({place.userRatingsTotal})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-gray-400" />
                        <span className={cn(
                          "text-[10px] font-bold",
                          place.openNow === true ? "text-green-500" : 
                          place.openNow === false ? "text-red-400" : "text-gray-400"
                        )}>
                          {place.openNow === true ? 'Buka' : place.openNow === false ? 'Tutup' : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <a 
                    href={`tel:${place.phoneNumber}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-primary active:scale-90 transition-transform shrink-0"
                  >
                    <Phone size={18} />
                  </a>
                </motion.div>
              ))
            ) : (
              <div className="py-12 flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                  <Search size={32} />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-gray-900">Tidak ada service center ditemukan</p>
                  <p className="text-xs text-gray-400 leading-relaxed max-w-[200px] mx-auto">
                    Coba perbesar radius pencarian untuk cakupan yang lebih luas.
                  </p>
                </div>
                <button 
                  onClick={expandSearch}
                  className="bg-gray-900 text-white font-black text-xs px-8 py-4 rounded-full shadow-xl active:scale-95 transition-transform"
                >
                  Perluas Pencarian
                </button>
              </div>
            )}
          </div>
          
          {/* Action Footer */}
          <div className="p-6 pt-2 bg-white border-t border-gray-50">
            <button 
              disabled={!selectedPlaceId}
              onClick={() => {
                const p = filteredPlaces.find(pl => pl.placeId === selectedPlaceId);
                if (p) window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`, '_blank');
              }}
              className="w-full bg-gray-900 disabled:bg-gray-100 text-white disabled:text-gray-400 font-black py-5 rounded-[24px] shadow-xl flex items-center justify-center gap-3 transition-all"
            >
              <Navigation size={20} />
              <span>Petunjuk Arah</span>
            </button>
          </div>
        </div>
      </div>
    </APIProvider>
  );
}

function FilterChip({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
        active 
          ? "bg-gray-900 text-white border-gray-900 shadow-lg" 
          : "bg-white/90 backdrop-blur-md text-gray-900 border-white shadow-sm"
      )}
    >
      {label}
    </button>
  );
}
