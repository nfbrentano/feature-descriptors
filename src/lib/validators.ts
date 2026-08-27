import { Descriptor, Annotation, AnnotationCoords, BBoxCoords, PointCoords, PolygonCoords, FreehandCoords } from '../types'

/**
 * Validates whether the given object is a valid Descriptor structure.
 */
export function isValidDescriptor(obj: any): obj is Descriptor {
  if (!obj || typeof obj !== 'object') return false
  if (typeof obj.id !== 'string' || typeof obj.title !== 'string') return false
  if (!obj.image || typeof obj.image !== 'object' || typeof obj.image.url !== 'string') return false
  if (!Array.isArray(obj.annotations)) return false

  return obj.annotations.every(isValidAnnotation)
}

/**
 * Validates whether the given object is a valid Annotation.
 */
export function isValidAnnotation(obj: any): obj is Annotation {
  if (!obj || typeof obj !== 'object') return false
  if (typeof obj.id !== 'string' || typeof obj.type !== 'string') return false
  if (!['bbox', 'point', 'polygon', 'freehand'].includes(obj.type)) return false
  if (!obj.coords || typeof obj.coords !== 'object') return false
  if (typeof obj.title !== 'string') return false
  if (!Array.isArray(obj.tags)) return false
  if (!Array.isArray(obj.messages)) return false

  return isValidCoords(obj.type, obj.coords)
}

/**
 * Validates coordinates based on annotation type.
 */
export function isValidCoords(type: string, coords: any): coords is AnnotationCoords {
  if (!coords || typeof coords !== 'object') return false

  switch (type) {
    case 'bbox': {
      const c = coords as BBoxCoords
      return (
        typeof c.x === 'number' &&
        typeof c.y === 'number' &&
        typeof c.w === 'number' &&
        typeof c.h === 'number' &&
        !isNaN(c.x) && !isNaN(c.y) && !isNaN(c.w) && !isNaN(c.h)
      )
    }
    case 'point': {
      const c = coords as PointCoords
      return typeof c.x === 'number' && typeof c.y === 'number' && !isNaN(c.x) && !isNaN(c.y)
    }
    case 'polygon': {
      const c = coords as PolygonCoords
      return (
        Array.isArray(c.points) &&
        c.points.length >= 3 &&
        c.points.every(p => typeof p.x === 'number' && typeof p.y === 'number' && !isNaN(p.x) && !isNaN(p.y))
      )
    }
    case 'freehand': {
      const c = coords as FreehandCoords
      return (
        Array.isArray(c.strokes) &&
        c.strokes.every(stroke =>
          Array.isArray(stroke) &&
          stroke.every(p => typeof p.x === 'number' && typeof p.y === 'number' && !isNaN(p.x) && !isNaN(p.y))
        )
      )
    }
    default:
      return false
  }
}

/**
 * Validates and safely parses an imported JSON file string.
 */
export function parseAndValidateDescriptorImport(jsonString: string): {
  valid: boolean
  data?: Descriptor
  error?: string
} {
  try {
    const parsed = JSON.parse(jsonString)
    if (!isValidDescriptor(parsed)) {
      return {
        valid: false,
        error: 'O arquivo JSON não corresponde à estrutura válida de um Descritivo de Interface.'
      }
    }
    return { valid: true, data: parsed }
  } catch (err: any) {
    return {
      valid: false,
      error: `Formato JSON inválido: ${err.message || 'Erro de sintaxe'}`
    }
  }
}
