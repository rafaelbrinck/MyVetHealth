import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
// Importe os ícones necessários aqui
import {
  Building2,
  Edit2, // Esse é o "edit-2"
  Save,
  X,
  MapPin,
  Phone,
  Mail,
  Hash,
  Info,
  ChevronLeft, // Caso use em algum lugar
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync('animations'),
    importProvidersFrom(
      // O segredo está em colocar TODOS os ícones que você usa no HTML aqui dentro
      LucideAngularModule.pick({
        Building2,
        Edit2, // REGISTRADO!
        Save,
        X,
        MapPin,
        Phone,
        Mail,
        Hash,
        Info,
      }),
    ),
  ],
};
