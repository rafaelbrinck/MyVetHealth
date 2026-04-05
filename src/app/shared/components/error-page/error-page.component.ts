import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './error-page.component.html',
})
export class ErrorPageComponent {
  private location = inject(Location);

  voltar() {
    this.location.back();
  }
}
