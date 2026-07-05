import { Component, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

declare var google: any;

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent implements AfterViewInit {
  private router = inject(Router);

  ngAfterViewInit(): void {
    google.accounts.id.initialize({
      client_id: '133533206595-81ufmjk6israq9pepoittj21o7d9ofeh.apps.googleusercontent.com',
      callback: this.lidarComLogin.bind(this)
    });

    google.accounts.id.renderButton(
      document.getElementById('google-btn'),
      { theme: 'outline', size: 'large', shape: 'pill' }
    );
  }

  async lidarComLogin(response: any) {
    const token = response.credential;
    try {
      const res = await fetch('http://localhost:8787/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await res.json();

      if (data.success) {
        // AJUSTE AQUI: Lendo os dados de data.data.user
        localStorage.setItem('user_name', data.data.user.name);
        localStorage.setItem('user_email', data.data.user.email);
        this.router.navigate(['/dashboard']);
      }
    } catch (err) {
      console.error('Erro:', err);
    }
  }
}