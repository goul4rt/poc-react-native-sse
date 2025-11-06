export interface Produto {
  id: string;
  nome: string;
  status: 'disponivel' | 'em_processamento' | 'finalizado';
  clienteId: string | null;
  finalizadoEm?: string;
}

export interface Carga {
  id: string;
  totalProdutos: number;
  produtosDisponiveis: number;
  produtosEmProcessamento: number;
  produtosFinalizados: number;
}

