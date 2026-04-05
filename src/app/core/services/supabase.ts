import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../data/environments/enviroment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabaseClient: SupabaseClient;

  constructor() {
    this.supabaseClient = new SupabaseClient(environment.supabaseUrl, environment.supabaseKey);
  }

  get client(): SupabaseClient {
    return this.supabaseClient;
  }
}
