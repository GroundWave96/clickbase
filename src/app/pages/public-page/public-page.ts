import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-public-page',
  standalone: true,
  imports: [UpperCasePipe, RouterModule],
  templateUrl: './public-page.html'
})
export class PublicPageComponent implements OnInit {
  slug: string | null = null;

  page: any = null;
  folders: any[] = [];
  links: any[] = [];

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
      const res = await fetch(`${environment.apiUrl}/api/public/${slug}`);
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

  get estruturaUnificada() {
    const pastas = this.folders.map(f => ({ ...f, type: 'folder' }));
    const soltos = this.links.filter(l => !l.folder_uuid).map(l => ({ ...l, type: 'link' }));

    return [...pastas, ...soltos].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }
}