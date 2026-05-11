import React from 'react';
import { YouTubeVideo } from '../services/youtubeService';
import { Play, ExternalLink } from 'lucide-react';

interface TutorialsProps {
  videos: YouTubeVideo[];
  itemName: string;
}

export function Tutorials({ videos, itemName }: TutorialsProps) {
  if (videos.length === 0) return null;

  return (
    <div className="px-6 py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Tutorial DIY</h3>
        <span className="text-xs text-gray-400 font-medium">YouTube</span>
      </div>
      
      <div className="flex flex-col gap-3">
        {videos.map((video) => (
          <a 
            key={video.id}
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-4 p-3 bg-white rounded-2xl border border-gray-100 hover:border-primary/50 transition-colors group shadow-sm"
          >
            <div className="relative w-28 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="text-white w-6 h-6 fill-white" />
              </div>
            </div>
            <div className="flex flex-col justify-center gap-1 min-w-0">
              <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight">
                {video.title}
              </h4>
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                {video.channelTitle}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
