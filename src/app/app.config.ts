import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideCalendar } from 'angular-calendar';
import { DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import {
  Building2,
  Edit2,
  Hash,
  Info,
  LucideAngularModule,
  Mail,
  MapPin,
  Phone,
  Save,
  X,
} from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideCalendar({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
    // app.config.ts
    importProvidersFrom(
      LucideAngularModule.pick({ Building2, Edit2, Save, X, MapPin, Phone, Mail, Hash, Info }),
    ),
  ],
};
