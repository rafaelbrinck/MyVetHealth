import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen min-w-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <router-outlet></router-outlet>
    </div>
  `,
})
export class AuthLayoutComponent {}
