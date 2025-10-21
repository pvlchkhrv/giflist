import { Component, inject } from '@angular/core';
import { RedditService } from '../shared/data-access/reddit.service';
import { GifList } from './ui/gif-list';

@Component({
  standalone: true,
  selector: 'app-home',
  template: `
    <app-gif-list [gifs]="redditService.gifs()" class="grid-container"></app-gif-list>
  `,
  imports: [GifList]
})
export default class HomeComponent {
  redditService = inject(RedditService);
}
