import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {
  user: any = null;
  pages: any[] = [];
  slugStatus: 'idle' | 'checking' | 'available' | 'unavailable' = 'idle';
  typingTimer: any;
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    const email = localStorage.getItem('user_email');
    
    if (email) {
      try {
        const resUser = await fetch(`http://localhost:8787/api/user/${email}`);
        const dataUser = await resUser.json();
        this.user = dataUser.user;
        
        await this.carregarPaginas(email);
        
        this.cdr.detectChanges(); 
      } catch (err) {
        console.error('Erro ao buscar dados iniciais:', err);
      }
    }
  }

  onTituloInput(titulo: string, inputSlug: HTMLInputElement) {
    const slugSugerido = titulo
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
      
    inputSlug.value = slugSugerido;
    this.validarSlug(slugSugerido);
  }

  validarSlug(slug: string) {
    if (!slug) {
      this.slugStatus = 'idle';
      this.cdr.detectChanges();
      return;
    }

    this.slugStatus = 'checking';
    this.cdr.detectChanges();
    
    clearTimeout(this.typingTimer); 

    this.typingTimer = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:8787/api/pages/check-slug/${slug}`);
        
        if (!res.ok) throw new Error('Erro na resposta da API'); 
        
        const data = await res.json();
        this.slugStatus = data.available ? 'available' : 'unavailable';
        this.cdr.detectChanges();
        
      } catch (err) {
        console.error('Falha ao validar URL:', err);
        this.slugStatus = 'idle';
        this.cdr.detectChanges();
      }
    }, 800); 
  }

  async carregarPaginas(email: string) {
    try {
      const res = await fetch(`http://localhost:8787/api/pages/${email}`);
      const data = await res.json();
      if (data.success) {
        this.pages = data.pages;
      }
    } catch (error) {
      console.error('Erro ao carregar páginas:', error);
    }
  }

  async criarPagina(titulo: string, slug: string) {
    if (!titulo || !slug) {
      alert('Preencha o título e a URL personalizada!');
      return;
    }

    const slugFormatado = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const email = localStorage.getItem('user_email');
    
    try {
      const res = await fetch('http://localhost:8787/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: email, title: titulo, slug: slugFormatado })
      });
      
      const data = await res.json();
      
      if (data.success) {
        await this.carregarPaginas(email!);
        this.cdr.detectChanges();
      } else {
        alert(`Não foi possível criar: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao criar página:', error);
    }
  }
}