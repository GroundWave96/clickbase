import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { UpperCasePipe } from '@angular/common'; // <-- O import que faltava

@Component({
  selector: 'app-public-page',
  standalone: true, // Garante que é um componente independente
  imports: [UpperCasePipe, RouterModule], // <-- Declaramos o que vamos usar no HTML
  templateUrl: './public-page.html'
})
export class PublicPageComponent implements OnInit {
  slug: string | null = null;

  // Dados recebidos da API
  page: any = null;
  folders: any[] = [];
  links: any[] = [];

  // Controle de estado
  loading: boolean = true;
  notFound: boolean = false;

  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    this.slug = this.route.snapshot.paramMap.get('slug');

    if (this.slug) {
      await this.carregarDadosPublicos(this.slug);
    }
  }

  async carregarDadosPublicos(slug: string) {
    try {
      const res = await fetch(`http://localhost:8787/api/public/${slug}`);
      const data = await res.json();

      if (data.success) {
        this.page = data.data.page;
        this.folders = data.data.folders;
        this.links = data.data.links;
      } else {
        this.notFound = true;
      }
    } catch (error) {
      console.error('Erro ao carregar a página pública:', error);
      this.notFound = true;
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  getLinksSoltos() {
    return this.links.filter(link => !link.folder_uuid);
  }

  getLinksDaPasta(folderUuid: string) {
    return this.links.filter(link => link.folder_uuid === folderUuid);
  }

  // No seu public-page.ts, substitua os getters atuais por este:
  get estruturaUnificada() {
    const pastas = this.folders.map(f => ({ ...f, type: 'folder' }));
    const soltos = this.links.filter(l => !l.folder_uuid).map(l => ({ ...l, type: 'link' }));

    // O segredo está aqui: ordenar pela coluna que salvamos no banco
    return [...pastas, ...soltos].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }
}