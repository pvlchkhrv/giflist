import { Component, effect, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterOutlet } from '@angular/router';
import { RedditService } from './shared/data-access/reddit.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet/>`,
  styles: [],
})
export class App {
  redditService = inject(RedditService);
  snackBar = inject(MatSnackBar);

  constructor() {
    effect(() => {
      const error = this.redditService.error();

      if (error !== null) {
        this.snackBar.open(error, 'Dismiss', { duration: 2000 });
      }
    });
  }
}
