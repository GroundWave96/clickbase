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

  lidarComLogin(response: any) {
    console.log('JWT recebido do Google:', response.credential);
  }
}