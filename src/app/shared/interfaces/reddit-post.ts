export interface RedditPost {
  data: RedditPostData;
}

interface RedditPostData {
  author: string;
  name: string;
  permalink: string;
  preview: RedditPreview;
  secure_media: RedditMedia;
  title: string;
  media: RedditMedia;
  url: string;
  thumbnail: string;
  num_comments: number;
  url_overridden_by_dest: string;
}

interface RedditPreview {
  enabled: boolean;
  images: RedditPreviewImage[];
  reddit_video_preview: RedditVideoPreview;
}

interface RedditPreviewImage {
  id: string;
  variants: RedditPreviewImageVariants;
}

interface RedditPreviewImageVariants {
  gif?: {
    source: RedditImageSource;
  };
  mp4?: {
    source: RedditImageSource;
  };
}

interface RedditImageSource {
  height: number;
  width: number;
  url: string;
}

interface RedditVideoPreview {
  is_gif: boolean;
  fallback_url: string;
}

interface RedditMedia {
  reddit_video: RedditVideoPreview;
}
