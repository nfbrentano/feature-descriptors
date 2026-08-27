import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHistory } from './history'

describe('useHistory', () => {
  it('manages state and supports undo/redo operations', () => {
    const { result } = renderHook(() => useHistory<number>(10))

    expect(result.current.state).toBe(10)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)

    // Set new value
    act(() => {
      result.current.set(20)
    })

    expect(result.current.state).toBe(20)
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)

    // Set another value
    act(() => {
      result.current.set(30)
    })

    expect(result.current.state).toBe(30)
    expect(result.current.canUndo).toBe(true)

    // Undo
    act(() => {
      result.current.undo()
    })

    expect(result.current.state).toBe(20)
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(true)

    // Undo again
    act(() => {
      result.current.undo()
    })

    expect(result.current.state).toBe(10)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)

    // Redo
    act(() => {
      result.current.redo()
    })

    expect(result.current.state).toBe(20)
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(true)
  })

  it('resets history cleanly', () => {
    const { result } = renderHook(() => useHistory<string>('initial'))

    act(() => {
      result.current.set('modified')
    })

    expect(result.current.canUndo).toBe(true)

    act(() => {
      result.current.reset('fresh')
    })

    expect(result.current.state).toBe('fresh')
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })
})
