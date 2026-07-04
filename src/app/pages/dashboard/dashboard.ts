import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {
  userName: string = '';

  ngOnInit() {
    this.userName = localStorage.getItem('user_name') || 'Visitante';
  }
}