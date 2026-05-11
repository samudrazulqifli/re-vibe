import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!apiKey) {
      console.error('YOUTUBE_API_KEY is not configured');
      return NextResponse.json({ error: 'YouTube API not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        query
      )}&type=video&maxResults=3&relevanceLanguage=id&key=${apiKey}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API error details:', errorData);
      throw new Error('Failed to fetch YouTube videos');
    }

    const data = await response.json();
    
    const videos = data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
      // Duration and view count would require another call to videos.list with IDs
      // but for simplicity and to avoid too many quota hits, we'll stick to search for now.
      // If we really need them, we can add a secondary fetch.
    }));

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('YouTube API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
