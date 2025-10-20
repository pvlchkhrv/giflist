import { Component, input } from '@angular/core';
import { Gif } from '../../shared/interfaces';
import { GifPlayer } from './gif-player';

@Component({
  selector: 'app-gif-list',
  imports: [
    GifPlayer
  ],
  template: `
    @for (gif of gifs(); track gif.permalink) {
      <div>
        <app-gif-player
          [src]="gif.src"
          [thumbnail]="gif.thumbnail"
        ></app-gif-player>
      </div>
    }
  `
})
export class GifList {
  gifs = input.required<Gif[]>();
}
