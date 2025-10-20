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
        `https://developers.giphy.com/docs/api/endpoint#trending`
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
    // If the source is in .mp4 format, leave unchanged
    if (post.data.url.indexOf('.mp4') > -1) {
      return post.data.url;
    }

    // If the source is in .gifv or .webm formats, convert to .mp4 and return
    if (post.data.url.indexOf('.gifv') > -1) {
      return post.data.url.replace('.gifv', '.mp4');
    }

    if (post.data.url.indexOf('.webm') > -1) {
      return post.data.url.replace('.webm', '.mp4');
    }

    // If the URL is not .gifv or .webm, check if media or secure media is available
    if (post.data.secure_media?.reddit_video) {
      return post.data.secure_media.reddit_video.fallback_url;
    }

    if (post.data.media?.reddit_video) {
      return post.data.media.reddit_video.fallback_url;
    }

    // If media objects are not available, check if a preview is available
    if (post.data.preview?.reddit_video_preview) {
      return post.data.preview.reddit_video_preview.fallback_url;
    }

    // No usable formats available
    return null;
  }
}
