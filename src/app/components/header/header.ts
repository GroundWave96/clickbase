import { Component, AfterViewInit, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

declare var google: any;

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  
  isLoggedIn = false;
  userName: string | null = '';

  ngOnInit(): void {
    const email = localStorage.getItem('user_email');
    if (email) {
      this.isLoggedIn = true;
      this.userName = localStorage.getItem('user_name');
    }
  }

  ngAfterViewInit(): void {
    if (!this.isLoggedIn) {
      google.accounts.id.initialize({
        client_id: '133533206595-81ufmjk6israq9pepoittj21o7d9ofeh.apps.googleusercontent.com',
        callback: this.lidarComLogin.bind(this)
      });
      google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        { theme: 'outline', size: 'large', shape: 'pill' }
      );
    }
  }

  async lidarComLogin(response: any) {
    const token = response.credential;
    try {
      const res = await fetch(`${environment.apiUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('user_name', data.data.user.name);
        localStorage.setItem('user_email', data.data.user.email);
        
        this.isLoggedIn = true;
        this.userName = data.data.user.name;
        
        this.router.navigate(['/dashboard']);
      }
    } catch (err) {
      console.error('Erro:', err);
    }
  }
}