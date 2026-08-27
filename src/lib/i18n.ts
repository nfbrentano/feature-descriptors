export const messages = {
  app: {
    title: 'Feature Descriptors',
    subtitle: 'Descritivos de Funcionalidades e Wireframes Interativos'
  },
  header: {
    manageDescriptors: 'Meus Descritivos',
    undo: 'Desfazer (Ctrl+Z)',
    redo: 'Refazer (Ctrl+Y)',
    export: 'Exportar Documento',
    presentation: 'Modo Apresentação (F5)',
    shortcuts: 'Atalhos de Teclado (?)',
    login: 'Entrar / Sincronizar',
    syncSuccess: 'Sincronizado com Supabase',
    syncError: 'Falha ao sincronizar'
  },
  canvas: {
    zoomIn: 'Aumentar Zoom (Ctrl +)',
    zoomOut: 'Diminuir Zoom (Ctrl -)',
    zoomReset: 'Resetar Zoom (Ctrl 0)',
    toggleHeatmap: 'Alternar Mapa de Calor',
    toggleRuler: 'Alternar Réguas de Medição',
    tools: {
      select: 'Selecionar / Mover Elemento (V)',
      bbox: 'Retângulo / Bounding Box (R)',
      point: 'Ponto / Marcador de Destaque (P)',
      polygon: 'Polígono Livre (G)',
      freehand: 'Desenho Livre / Caneta (D)',
      pan: 'Mover Tela / Pan (H)'
    }
  },
  sidebar: {
    title: 'Anotações da Tela',
    filterAll: 'Todas',
    filterOpen: 'Abertas',
    filterInProgress: 'Em Andamento',
    filterResolved: 'Resolvidas',
    emptyState: 'Nenhuma anotação encontrada neste descritivo.',
    newAnnotation: 'Nova Anotação'
  },
  thread: {
    title: 'Detalhes da Anotação',
    deleteConfirm: 'Tem certeza que deseja excluir esta anotação?',
    addComment: 'Adicionar comentário ou especificação...',
    submitComment: 'Enviar',
    cssSelector: 'Seletor CSS',
    xpath: 'XPath',
    tags: 'Etiquetas',
    points: 'Pontos de Esforço',
    status: 'Status'
  },
  export: {
    title: 'Exportar Descritivo',
    markdown: 'Markdown (.md)',
    jira: 'Formato Jira',
    github: 'Formato GitHub Issue',
    json: 'Arquivo JSON Completo',
    html: 'Documento HTML Interativo',
    copied: 'Copiado para a área de transferência!',
    download: 'Baixar Arquivo'
  },
  modals: {
    close: 'Fechar modal',
    cancel: 'Cancelar',
    save: 'Salvar',
    delete: 'Excluir',
    confirm: 'Confirmar'
  },
  errors: {
    generic: 'Ocorreu um erro inesperado na interface.',
    reload: 'Recarregar Aplicação',
    canvasError: 'Ocorreu uma falha na renderização do canvas.'
  }
} as const

export type MessageDictionary = typeof messages
