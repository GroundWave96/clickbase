import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { authGuard } from './guards/auth-guard';
import { EditorComponent } from './pages/editor/editor';
import { PublicPageComponent } from './pages/public-page/public-page';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'editor/:id', component: EditorComponent },
  { path: ':slug', component: PublicPageComponent }
];