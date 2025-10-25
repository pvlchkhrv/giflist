import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { connect } from 'ngxtension/connect';
import {
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  expand,
  map, merge,
  startWith,
  Subject,
  switchMap
} from 'rxjs';
import { Gif, RedditPost, RedditResponse } from '../interfaces';

export interface GifsState {
  gifs: Gif[];
  error: string | null;
  loading: boolean;
  lastKnownGif: string | null;
}

@Injectable({ providedIn: 'root' })
export class RedditService {
  private http = inject(HttpClient);
  subredditFormControl = new FormControl<string>('', { nonNullable: true });

  // state
  private gifsState = signal<GifsState>({
    gifs: [],
    error: null,
    loading: true,
    lastKnownGif: null,
  });

  // selectors
  gifs = computed(() => this.gifsState().gifs);
  error = computed(() => this.gifsState().error);
  loading = computed(() => this.gifsState().loading);
  lastKnownGif = computed(() => this.gifsState().lastKnownGif);

  // sources
  pagination$ = new Subject<string | null>();
  private subredditChanged$ = this.subredditFormControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    startWith('gifs'),
    map((subreddit) => (subreddit.length ? subreddit : 'gifs'))
  );
  private gifsLoaded$ = this.subredditChanged$.pipe(
    switchMap((subreddit) =>
      this.pagination$.pipe(
        startWith(null),
        concatMap((lastKnownGif) =>
          this.fetchFromReddit(subreddit, lastKnownGif, 20).pipe(
            expand((response, index) => {
              const { gifs, gifsRequired, lastKnownGif } = response;
              const remainingGifsToFetch = gifsRequired - gifs.length;
              const maxAttempts = 15;

              const shouldKeepTrying =
                remainingGifsToFetch > 0 &&
                index < maxAttempts &&
                lastKnownGif !== null;

              return shouldKeepTrying
                ? this.fetchFromReddit(
                  subreddit,
                  lastKnownGif,
                  remainingGifsToFetch
                )
                : EMPTY;
            })
          )
        )
      )
    )
  );
  private error$ = new Subject<string | null>();

  constructor() {
    const nextState$ = merge(
      this.subredditChanged$.pipe(
        map(() => ({
          loading: true,
          gifs: [],
          lastKnownGif: null,
        }))
      ),
      this.error$.pipe(map((error) => ({ error })))
    );

    connect(this.gifsState)
      .with(nextState$)
      .with(this.gifsLoaded$, (state, response) => ({
        ...state,
        gifs: [...state.gifs, ...response.gifs],
        loading: false,
        lastKnownGif: response.lastKnownGif
      }))
  }

  private fetchFromReddit(
    subreddit: string,
    after: string | null,
    gifsRequired: number
  ) {
    return this.http
      .get<RedditResponse>(
        `/reddit/r/${subreddit}/hot/.json?limit=100` + (after ? `&after=${after}` : '')
      )
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((response) => {
          const posts = response.data.children;
          const lastKnownGif = posts.length
            ? posts[posts.length - 1].data.name
            : null;

          return {
            gifs: this.convertRedditPostsToGifs(posts),
            gifsRequired,
            lastKnownGif,
          };
        })
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
    if (url.endsWith('.gif')) return unescape(url); // allow plain GIFs as a fallback

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

  private handleError(err: HttpErrorResponse) {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      this.error$.next(`Failed to load gifs for /r/${err.url.split('/')[4]}`);
      return;
    }

    // Generic error if no cases match
    this.error$.next(err.statusText);
  }
}
