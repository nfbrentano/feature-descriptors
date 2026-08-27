import { useState, useCallback } from 'react'
import { ViewTool, AnnotationStatus } from '../types'

export type ThemeMode = 'dark' | 'light' | 'wireframe' | 'high_contrast' | 'cyberpunk'

export function useCanvasState() {
  const [activeTool, setActiveTool] = useState<ViewTool>('select')
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showRuler, setShowRuler] = useState(false)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<AnnotationStatus | 'all'>('all')
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('fd_theme') as ThemeMode) || 'dark'
  })

  const handleSetTheme = useCallback((theme: ThemeMode) => {
    setCurrentTheme(theme)
    localStorage.setItem('fd_theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [])

  const resetSelection = useCallback(() => {
    setSelectedAnnotationId(null)
  }, [])

  return {
    activeTool,
    setActiveTool,
    selectedAnnotationId,
    setSelectedAnnotationId,
    showHeatmap,
    setShowHeatmap,
    showRuler,
    setShowRuler,
    filterTag,
    setFilterTag,
    filterStatus,
    setFilterStatus,
    currentTheme,
    setCurrentTheme: handleSetTheme,
    resetSelection
  }
}
