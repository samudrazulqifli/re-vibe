import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { lat, lng, keyword, radius = 5000 } = await req.json();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API Key not configured' }, { status: 500 });
    }

    const textQuery = keyword || 'service center';

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours.openNow,places.internationalPhoneNumber'
      },
      body: JSON.stringify({
        textQuery,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius
          }
        },
        maxResultCount: 20
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Places API Error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch nearby places', detail: errorText }, { status: response.status });
    }

    const data = await response.json();

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
      distance: calculateDistance(lat, lng, p.location?.latitude, p.location?.longitude)
    }));

    return NextResponse.json({ places });
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
