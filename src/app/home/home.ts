import { Component, inject } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { RedditService } from '../shared/data-access/reddit.service';
import { GifList } from './ui/gif-list';
import { SearchBar } from './ui/search-bar';

@Component({
  standalone: true,
  selector: 'app-home',
  template: `
    <app-search-bar [formControl]="redditService.subredditFormControl"></app-search-bar>
    @if (redditService.loading()) {
      <mat-progress-spinner mode="indeterminate" diameter="50"/>
    } @else {
      <app-gif-list
        [gifs]="redditService.gifs()"
        infiniteScroll
        (scrolled)="redditService.pagination$.next(redditService.lastKnownGif())"
        class="grid-container"
      />
    }
  `,
  styles: [
    `
      mat-progress-spinner {
        margin: 2rem auto;
      }
    `,
  ],
  imports: [GifList, InfiniteScrollDirective, SearchBar, MatProgressSpinner],
})
export default class HomeComponent {
  redditService = inject(RedditService);
}
