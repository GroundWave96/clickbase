import { Component, AfterViewInit } from '@angular/core';

declare var google: any;

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent implements AfterViewInit {

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
    console.log('JWT recebido do Google:', token);

    try {
      const res = await fetch('http://localhost:8787/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await res.json();
      console.log('Resposta da nossa API:', data);
      
      if (data.success) {
        alert(`Bem-vindo, ${data.user.name}!`);
      }
    } catch (err) {
      console.error('Erro ao conectar na API:', err);
    }
  }
}