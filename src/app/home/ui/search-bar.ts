import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatToolbar } from '@angular/material/toolbar';

@Component({
  selector: 'app-search-bar',
  template:
    `
      <mat-toolbar>
        <mat-form-field class="search-form-field" appearance="outline">
          <mat-label>subreddit...</mat-label>
          <input matInput type="text" [formControl]="formControl()"/>
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </mat-toolbar>
    `,
  styles: [
    `
      mat-toolbar {
        height: 80px;
      }

      mat-form-field {
        width: 100%;
        padding-top: 20px;
      }
    `,
  ],
  imports: [MatInput, MatFormField, MatLabel, ReactiveFormsModule, MatToolbar, MatIcon],
})
export class SearchBar {
  formControl = input.required<FormControl<string>>();
}
