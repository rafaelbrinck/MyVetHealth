import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Muito importante para o <router-outlet>

@Component({
  selector: 'app-tutor-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tutor-layout.html',
  styleUrl: './tutor-layout.css'
})
export class TutorLayoutComponent {
  // O Layout em si não precisa de lógica complexa, serve apenas de molde visual
}