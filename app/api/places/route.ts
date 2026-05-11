import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { lat, lng, keyword, radius = 5000 } = await req.json();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API Key not configured' }, { status: 500 });
    }

    // New Places API (v1) Nearby Search
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Field mask is crucial for New Places API
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours.openNow,places.internationalPhoneNumber'
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radius
          }
        },
        maxResultCount: 20,
        includedTypes: ['establishment', 'store'],
        rankPreference: 'DISTANCE'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Places API Error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch nearby places' }, { status: response.status });
    }

    const data = await response.json();
    
    // Map to user expected format
    const places = (data.places || []).map((p: any) => ({
      placeId: p.id,
      name: p.displayName?.text || 'Unnamed Place',
      address: p.formattedAddress || '',
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      rating: p.rating || 0,
      userRatingsTotal: p.userRatingCount || 0,
      openNow: p.currentOpeningHours?.openNow ?? null,
      phoneNumber: p.internationalPhoneNumber || '',
      // Distance is not return by Nearby Search V1 by default in a friendly way, 
      // but we requested rankPreference: DISTANCE so they are ordered.
      // We'll calculate a simple distance in km for UI display.
      distance: calculateDistance(lat, lng, p.location?.latitude, p.location?.longitude)
    }));

    // Filter by keyword if provided (New Nearby Search focuses on types, text query is Text Search)
    // For Nearby Search, it doesn't support a "keyword" field in the same way the old API did.
    // If the user wants specific keyword, Text Search might be better, 
    // but the prompt explicitly asked for Nearby Search.
    // We'll just return what we got, assuming the "keyword" from store was used for context 
    // or we can use it to filter on server if needed.
    // Actually, "keyword" is often used to match against display name.
    const filteredPlaces = keyword 
      ? places.filter((p: any) => p.name.toLowerCase().includes(keyword.toLowerCase()))
      : places;

    return NextResponse.json({ places: filteredPlaces });
  } catch (error) {
    console.error('Places route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  if (!lat2 || !lon2) return 0;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
}
