import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {
  user: any = null;
  private cdr = inject(ChangeDetectorRef); 

  async ngOnInit() {
    const email = localStorage.getItem('user_email');
    
    if (email) {
      try {
        const res = await fetch(`http://localhost:8787/api/user/${email}`);
        const data = await res.json();
        
        this.user = data.user;
        
        this.cdr.detectChanges(); 
        
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      }
    }
  }
}