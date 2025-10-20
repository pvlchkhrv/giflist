import { computed, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { Gif } from '../interfaces';

export interface GifsState {
  gifs: Gif[];
}

@Injectable({ providedIn: 'root' })
export class RedditService {
  private gifsState = signal<GifsState>({
    gifs: []
  });

  // selectors
  gifs = computed(() => this.gifsState().gifs);

  // sources
  gifsLoaded$ = of([
    {
      src: '',
      author: '',
      name: '',
      permalink: '',
      title: 'test gif',
      thumbnail: '',
      comments: 0,
    },
  ]);

  constructor() {
    // reducers
    this.gifsLoaded$.pipe(takeUntilDestroyed()).subscribe((gifs) => {
      this.gifsState.update((state) => ({
        ...state,
        gifs: [...state.gifs, ...gifs],
      }));
    });
  }
}
