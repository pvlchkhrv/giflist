import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, map, of } from 'rxjs';
import { Gif, RedditPost, RedditResponse } from '../interfaces';

export interface GifsState {
  gifs: Gif[];
}

@Injectable({ providedIn: 'root' })
export class RedditService {
  private http = inject(HttpClient);

  // state
  private gifsState = signal<GifsState>({
    gifs: []
  });

  // selectors
  gifs = computed(() => this.gifsState().gifs);

  // sources
  gifsLoaded$ = this.fetchFromReddit('gifs');

  constructor() {
    // reducers
    this.gifsLoaded$.pipe(takeUntilDestroyed()).subscribe((gifs) => {
      this.gifsState.update((state) => ({
        ...state,
        gifs: [...state.gifs, ...gifs],
      }));
    });
  }

  private fetchFromReddit(subreddit: string) {
    return this.http
      .get<RedditResponse>(
        `/reddit/r/${subreddit}/hot/.json?limit=100`
      )
      .pipe(
        catchError((err) => EMPTY),
        map((response) => this.convertRedditPostsToGifs(response.data.children))
      );
  }

  private convertRedditPostsToGifs(posts: RedditPost[]) {
    const defaultThumbnails = ['default', 'none', 'nsfw'];

    return posts
      .map((post) => {
        const thumbnail = post.data.thumbnail;
        const modifiedThumbnail = defaultThumbnails.includes(thumbnail)
          ? `/assets/${thumbnail}.png`
          : thumbnail;

        return {
          src: this.getBestSrcForGif(post),
          author: post.data.author,
          name: post.data.name,
          permalink: post.data.permalink,
          title: post.data.title,
          thumbnail: modifiedThumbnail,
          comments: post.data.num_comments,
        };
      })
      .filter((post): post is Gif => post.src !== null);
  }

  private getBestSrcForGif(post: RedditPost) {
    const url = post.data.url ?? post.data.url_overridden_by_dest ?? '';
    const unescape = (u: string) => u.replace(/&amp;/g, '&');

    // Direct links
    if (url.endsWith('.mp4')) return unescape(url);
    if (url.endsWith('.gifv')) return unescape(url.replace('.gifv', '.mp4'));
    if (url.endsWith('.webm')) return unescape(url.replace('.webm', '.mp4'));
    if (url.endsWith('.gif'))  return unescape(url); // allow plain GIFs as a fallback

    // Hosted reddit videos
    if (post.data.secure_media?.reddit_video?.fallback_url) {
      return unescape(post.data.secure_media.reddit_video.fallback_url);
    }
    if (post.data.media?.reddit_video?.fallback_url) {
      return unescape(post.data.media.reddit_video.fallback_url);
    }
    if (post.data.preview?.reddit_video_preview?.fallback_url) {
      return unescape(post.data.preview.reddit_video_preview.fallback_url);
    }

    // Preview variants (most "image" posts with animations provide these)
    const mp4Variant = post.data.preview?.images?.[0]?.variants?.mp4?.source?.url;
    if (mp4Variant) return unescape(mp4Variant);

    const gifVariant = post.data.preview?.images?.[0]?.variants?.gif?.source?.url;
    if (gifVariant) return unescape(gifVariant);

    // Crossposts sometimes stash media there
    const xpost = (post as any).data?.crosspost_parent_list?.[0];
    if (xpost?.secure_media?.reddit_video?.fallback_url) {
      return unescape(xpost.secure_media.reddit_video.fallback_url);
    }
    const xMp4 = xpost?.preview?.images?.[0]?.variants?.mp4?.source?.url;
    if (xMp4) return unescape(xMp4);

    return null;
  }
}
