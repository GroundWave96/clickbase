import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

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
      const res = await fetch(`http://localhost:8787/api/pages/${email}`);
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
      const res = await fetch(`http://localhost:8787/api/folders/${pageId}`);
      const data = await res.json();
      if (data.success) {
        this.folders = data.data.folders;
        this.cdr.detectChanges(); // Atualiza a tela
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
      const res = await fetch('http://localhost:8787/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_uuid: this.pageId, title: titulo })
      });

      const data = await res.json();
      if (data.success) {
        await this.carregarPastas(this.pageId!); // Puxa a lista atualizada
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
      const res = await fetch(`http://localhost:8787/api/folders/${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (data.success) {
        // Remove a pasta da lista visualmente sem precisar chamar a API de novo
        this.folders = this.folders.filter(f => f.uuid !== id);
        this.cdr.detectChanges();
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
      const res = await fetch(`http://localhost:8787/api/pages/${this.pageId}`, {
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
      const res = await fetch(`http://localhost:8787/api/links/${pageId}`);
      const data = await res.json();
      if (data.success) {
        this.links = data.data.links;
        this.cdr.detectChanges();
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
      const res = await fetch('http://localhost:8787/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_uuid: this.pageId,
          folder_uuid: folderUuid || null, // Se for vazio, fica solto
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
      const res = await fetch(`http://localhost:8787/api/links/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        // 1. Remove o link da nossa lista "bruta" (isso faz ele sumir de dentro das pastas)
        this.links = this.links.filter(l => l.uuid !== id);

        // 2. Recalcula a estrutura unificada (isso faz ele sumir dos links soltos na raiz)
        this.atualizarEstrutura();

        // 3. Força a tela a atualizar imediatamente
        this.cdr.detectChanges();
      } else {
        alert('Erro ao excluir o link.');
      }
    } catch (error) {
      console.error('Erro ao deletar link:', error);
    }
  }

  // Função auxiliar para o HTML: Pega os links que pertencem a uma pasta específica
  getLinksDaPasta(folderUuid: string) {
    return this.links.filter(link => link.folder_uuid === folderUuid);
  }

  // Função auxiliar para o HTML: Pega os links soltos (sem pasta)
  getLinksSoltos() {
    return this.links.filter(link => !link.folder_uuid);
  }

  voltar() {
    this.router.navigate(['/dashboard']);
  }

  dropPasta(event: CdkDragDrop<any[]>) {
    // 1. Move o item visualmente na tela
    moveItemInArray(this.folders, event.previousIndex, event.currentIndex);

    this.salvarNovaOrdem();
  }

  async salvarNovaOrdem() {
    try {
      // 1. Prepara o array injetando o type: 'folder' para a nova API entender
      const novaOrdem = this.folders.map((folder, index) => ({
        uuid: folder.uuid,
        type: 'folder', // <-- O back-end agora exige saber o que estamos ordenando
        order_index: index + 1
      }));

      // 2. Chama a rota unificada
      const res = await fetch('http://localhost:8787/api/reorder-all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: novaOrdem }) // <-- O back-end espera 'items'
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
    // Combinamos pastas e links em uma lista só
    const pastas = this.folders.map(f => ({ ...f, type: 'folder', order: f.order_index || 0 }));
    const linksSoltos = this.links.filter(l => !l.folder_uuid).map(l => ({ ...l, type: 'link', order: l.order_index || 0 }));

    // Juntamos tudo e ordenamos pela propriedade 'order'
    return [...pastas, ...linksSoltos].sort((a, b) => a.order - b.order);
  }

  atualizarEstrutura() {
    const pastas = this.folders.map(f => ({ ...f, type: 'folder' }));
    const soltos = this.links.filter(l => !l.folder_uuid).map(l => ({ ...l, type: 'link' }));
    this.listaEstrutura = [...pastas, ...soltos].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    this.cdr.detectChanges();
  }

  // 4. O Drop agora trabalha na listaEstrutura
  async dropEstrutura(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.listaEstrutura, event.previousIndex, event.currentIndex);

    // O "await" aqui é crucial para garantir que a API receba os dados
    await this.salvarNovaOrdemUnificada();
  }

  async salvarNovaOrdemUnificada() {
    const novaOrdem = this.listaEstrutura.map((item, index) => ({
      uuid: item.uuid,
      type: item.type,
      order_index: index + 1
    }));


    try {
      const response = await fetch('http://localhost:8787/api/reorder-all', {
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

  async dropLinkInterno(event: CdkDragDrop<any[]>, folderUuid: string) {
    // Pega apenas os links que pertencem a esta pasta específica
    const linksDaPasta = this.getLinksDaPasta(folderUuid);

    // Move o link visualmente no array filtrado
    moveItemInArray(linksDaPasta, event.previousIndex, event.currentIndex);

    // Atualiza a propriedade order_index de cada link baseada na nova posição
    linksDaPasta.forEach((link, index) => {
      link.order_index = index + 1;
    });

    // Envia a nova ordem para o banco de dados
    await this.salvarNovaOrdemLinks(linksDaPasta);
  }

  // 2. A função que envia a requisição para a API (que o TypeScript não estava achando)
  async salvarNovaOrdemLinks(linksAtualizados: any[]) {
    // Prepara o payload aproveitando a nossa rota reorder-all
    const novaOrdem = linksAtualizados.map(link => ({
      uuid: link.uuid,
      type: 'link', // Avisa a API que estamos atualizando a tabela de links
      order_index: link.order_index
    }));

    try {
      await fetch('http://localhost:8787/api/reorder-all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: novaOrdem })
      });
      // Após salvar, você pode opcionalmente recarregar a lista geral para manter o state perfeitamente sincronizado
      await this.carregarLinks(this.pageId!);
    } catch (error) {
      console.error('Erro ao salvar ordem dos links internos:', error);
    }
  }

}