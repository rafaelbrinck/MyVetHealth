import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';

// 1. Importações vitais do Angular Calendar e Date-fns
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

// Importações dos Ícones (Lucide)
import {
  Building2,
  Edit2,
  Save,
  X,
  MapPin,
  Phone,
  Mail,
  Hash,
  Info,
  ChevronLeft,
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync('animations'),
    importProvidersFrom(
      // Configuração do Lucide (mantida intacta)
      LucideAngularModule.pick({
        Building2,
        Edit2,
        Save,
        X,
        MapPin,
        Phone,
        Mail,
        Hash,
        Info,
      }),
      // 2. A SOLUÇÃO: Adicionando o motor do Angular Calendar aqui!
      CalendarModule.forRoot({
        provide: DateAdapter,
        useFactory: adapterFactory,
      }),
    ),
  ],
};
