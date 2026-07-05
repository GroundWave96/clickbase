import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDragDrop, moveItemInArray, CdkDrag } from '@angular/cdk/drag-drop';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './editor.html'
})

export class EditorComponent implements OnInit {
  pageId: string | null = null;
  pageData: any = null;
  folders: any[] = [];
  links: any[] = [];
  listaEstrutura: any[] = [];
  buscandoTitulo: boolean = false;
  typingTimerTitulo: any;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    this.pageId = this.route.snapshot.paramMap.get('id');

    if (this.pageId) {
      await this.carregarPagina(this.pageId);
      await this.carregarPastas(this.pageId);
      await this.carregarLinks(this.pageId);
      this.atualizarEstrutura();
    }
  }

  async carregarPagina(uuid: string) {
    try {
      const email = localStorage.getItem('user_email');
      const res = await fetch(`${environment.apiUrl}/api/pages/${email}`);
      const data = await res.json();

      if (data.success) {
        this.pageData = data.data.pages.find((p: any) => p.uuid === uuid);
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Erro ao carregar os dados da página:', error);
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // LÓGICA DE PASTAS
  // ==========================================

  async carregarPastas(pageId: string) {
    try {
      const res = await fetch(`${environment.apiUrl}/api/folders/${pageId}`);
      const data = await res.json();
      
      if (data.success) {
        this.folders = data.data.folders; 
        this.atualizarEstrutura();
      }
    } catch (error) {
      console.error('Erro ao carregar pastas:', error);
    }
  }

  async criarPasta(titulo: string) {
    if (!titulo) {
      alert('Por favor, digite um nome para a pasta.');
      return;
    }

    try {
      const res = await fetch(`${environment.apiUrl}/api/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_uuid: this.pageId, title: titulo })
      });

      const data = await res.json();
      if (data.success) {
        await this.carregarPastas(this.pageId!);
      } else {
        alert('Erro ao criar a pasta.');
      }
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
    }
  }

  async deletarPasta(id: string, titulo: string) {
    const confirmacao = confirm(`Tem certeza que deseja deletar a pasta "${titulo}"?`);
    if (!confirmacao) return;

    try {
      const res = await fetch(`${environment.apiUrl}/api/folders/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        this.folders = this.folders.filter(f => f.uuid !== id);
        this.atualizarEstrutura();
      }
    } catch (error) {
      console.error('Erro ao deletar pasta:', error);
    }
  }

  // ==========================================
  // OUTRAS FUNÇÕES
  // ==========================================

  async excluirPagina() {
    const confirmacao = confirm(`ATENÇÃO: Você tem certeza que deseja excluir a página "${this.pageData.title}"?\n\nEsta ação apagará a página, todas as pastas e links associados a ela permanentemente.`);
    if (!confirmacao) return;

    try {
      const res = await fetch(`${environment.apiUrl}/api/pages/${this.pageId}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  }

  // ==========================================
  // LÓGICA DE LINKS
  // ==========================================

  async carregarLinks(pageId: string) {
    try {
      const res = await fetch(`${environment.apiUrl}/api/links/${pageId}`);
      const data = await res.json();
      
      if (data.success) {
        this.links = data.data.links;
        this.atualizarEstrutura();
      }
    } catch (error) {
      console.error('Erro ao carregar links:', error);
    }
  }

  async criarLink(titulo: string, url: string, folderUuid: string) {
    if (!titulo || !url) {
      alert('Por favor, preencha o título e a URL do link.');
      return;
    }

    try {
      const res = await fetch(`${environment.apiUrl}/api/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_uuid: this.pageId,
          folder_uuid: folderUuid || null,
          title: titulo,
          url: url
        })
      });

      const data = await res.json();
      if (data.success) {
        await this.carregarLinks(this.pageId!);
      }
    } catch (error) {
      console.error('Erro ao criar link:', error);
    }
  }

  async deletarLink(id: string) {
    const confirmacao = confirm('Excluir este link?');
    if (!confirmacao) return;

    try {
      const res = await fetch(`${environment.apiUrl}/api/links/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        this.links = this.links.filter(l => l.uuid !== id);

        this.atualizarEstrutura();

        this.cdr.detectChanges();
      } else {
        alert('Erro ao excluir o link.');
      }
    } catch (error) {
      console.error('Erro ao deletar link:', error);
    }
  }

  getLinksDaPasta(folderUuid: string) {
    return this.links
      .filter(link => link.folder_uuid === folderUuid)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }

  getLinksSoltos() {
    return this.links.filter(link => !link.folder_uuid);
  }

  voltar() {
    this.router.navigate(['/dashboard']);
  }

  dropPasta(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.folders, event.previousIndex, event.currentIndex);

    this.salvarNovaOrdem();
  }

  async salvarNovaOrdem() {
    try {
      const novaOrdem = this.folders.map((folder, index) => ({
        uuid: folder.uuid,
        type: 'folder',
        order_index: index + 1
      }));

      const res = await fetch(`${environment.apiUrl}/api/reorder-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: novaOrdem })
      });

      const data = await res.json();

      if (!data.success) {
        alert('Erro ao salvar nova ordem das pastas.');
      }
    } catch (error) {
      console.error('Erro ao salvar ordem:', error);
    }
  }

  get estruturaUnificada() {
    const pastas = this.folders.map(f => ({ ...f, type: 'folder', order: f.order_index || 0 }));
    const linksSoltos = this.links.filter(l => !l.folder_uuid).map(l => ({ ...l, type: 'link', order: l.order_index || 0 }));

    return [...pastas, ...linksSoltos].sort((a, b) => a.order - b.order);
  }

  atualizarEstrutura() {
    const pastas = this.folders.map(f => ({ ...f, type: 'folder' }));
    const soltos = this.links.filter(l => !l.folder_uuid).map(l => ({ ...l, type: 'link' }));
    this.listaEstrutura = [...pastas, ...soltos].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    this.cdr.detectChanges();
  }

  async salvarNovaOrdemUnificada() {
    const novaOrdem = this.listaEstrutura.map((item, index) => ({
      uuid: item.uuid,
      type: item.type,
      order_index: index + 1
    }));


    try {
      const response = await fetch(`${environment.apiUrl}/api/reorder-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: novaOrdem })
      });

      const data = await response.json();
      if (data.success) {
      } else {
        console.error("Erro na resposta da API:", data);
      }
    } catch (error) {
      console.error('Erro na conexão com a API:', error);
    }
  }

  async salvarNovaOrdemLinks(linksAtualizados: any[]) {
    const novaOrdem = linksAtualizados.map(link => ({
      uuid: link.uuid,
      type: 'link',
      order_index: link.order_index
    }));

    try {
      await fetch(`${environment.apiUrl}/api/reorder-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: novaOrdem })
      });
      await this.carregarLinks(this.pageId!);
    } catch (error) {
      console.error('Erro ao salvar ordem dos links internos:', error);
    }
  }

  onUrlInput(url: string, tituloInput: HTMLInputElement) {
    clearTimeout(this.typingTimerTitulo);

    if (!url) return;

    this.typingTimerTitulo = setTimeout(async () => {
      this.buscandoTitulo = true;
      this.cdr.detectChanges();

      try {
        const res = await fetch(`${environment.apiUrl}/api/extract-title`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();

        if (data.success && data.data.title) {
          tituloInput.value = data.data.title;
        }
      } catch (error) {
        console.error('Erro ao buscar título automaticamente:', error);
      } finally {
        this.buscandoTitulo = false;
        this.cdr.detectChanges();
      }
    }, 800);
  }

  // ==========================================
  // LÓGICA AVANÇADA DE DRAG AND DROP
  // ==========================================

  get listasConectadas() {
    return ['lista-raiz', ...this.folders.map(f => `lista-pasta-${f.uuid}`)];
  }

  soAceitaLinks = (drag: CdkDrag, drop: any) => {
    return drag.data?.type === 'link';
  }

  async dropEstrutura(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.listaEstrutura, event.previousIndex, event.currentIndex);
      this.listaEstrutura.forEach((item, index) => item.order_index = index + 1);
      this.cdr.detectChanges();
      await this.salvarNovaOrdemGeral(this.listaEstrutura);
    } else {
      const draggedLink = event.item.data;
      if (draggedLink.type === 'folder') return;

      const linkBruto = this.links.find(l => l.uuid === draggedLink.uuid);
      if (linkBruto) linkBruto.folder_uuid = null;

      const novaRaiz = [...this.folders.map(f => ({ ...f, type: 'folder' })), ...this.links.filter(l => !l.folder_uuid).map(l => ({ ...l, type: 'link' }))]
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

      const idx = novaRaiz.findIndex(i => i.uuid === draggedLink.uuid);
      novaRaiz.splice(idx, 1);
      novaRaiz.splice(event.currentIndex, 0, draggedLink);

      this.sincronizarIndicesLocais(novaRaiz);
      this.atualizarEstrutura();

      await this.salvarTransferenciaCross(draggedLink.uuid, null, novaRaiz);
    }
  }

  async dropLinkInterno(event: CdkDragDrop<any[]>, folderUuid: string) {
    if (event.previousContainer === event.container) {
      const linksDaPasta = this.getLinksDaPasta(folderUuid);
      moveItemInArray(linksDaPasta, event.previousIndex, event.currentIndex);
      this.sincronizarIndicesLocais(linksDaPasta);
      this.atualizarEstrutura();
      await this.salvarNovaOrdemGeral(linksDaPasta);
    } else {
      const draggedLink = event.item.data;

      const linkBruto = this.links.find(l => l.uuid === draggedLink.uuid);
      if (linkBruto) linkBruto.folder_uuid = folderUuid;

      const linksDaPasta = this.getLinksDaPasta(folderUuid);
      const idx = linksDaPasta.findIndex(l => l.uuid === draggedLink.uuid);
      linksDaPasta.splice(idx, 1);
      linksDaPasta.splice(event.currentIndex, 0, draggedLink);

      this.sincronizarIndicesLocais(linksDaPasta);
      this.atualizarEstrutura();

      await this.salvarTransferenciaCross(draggedLink.uuid, folderUuid, linksDaPasta);
    }
  }

  sincronizarIndicesLocais(listaVisual: any[]) {
    listaVisual.forEach((item, index) => {
      item.order_index = index + 1;
      if (item.type === 'link') {
        const alvo = this.links.find(x => x.uuid === item.uuid);
        if (alvo) alvo.order_index = item.order_index;
      } else {
        const alvo = this.folders.find(x => x.uuid === item.uuid);
        if (alvo) alvo.order_index = item.order_index;
      }
    });
  }

  async salvarNovaOrdemGeral(lista: any[]) {
    const novaOrdem = lista.map((item) => ({
      uuid: item.uuid,
      type: item.type || 'link',
      order_index: item.order_index
    }));
    await fetch(`${environment.apiUrl}/api/reorder-all`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: novaOrdem })
    });
  }

  async salvarTransferenciaCross(linkUuid: string, newFolderUuid: string | null, listaAlvo: any[]) {
    try {
      await fetch(`${environment.apiUrl}/api/links/${linkUuid}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_uuid: newFolderUuid })
      });
      await this.salvarNovaOrdemGeral(listaAlvo);
    } catch (e) {
      console.error('Erro na transferência:', e);
    }
  }

}