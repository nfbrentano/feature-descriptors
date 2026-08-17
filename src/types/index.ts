export type AnnotationType = 'bbox' | 'point' | 'polygon'

export type AnnotationStatus = 'open' | 'in_progress' | 'resolved'

export interface BBoxCoords {
  x: number // percentage 0 to 1
  y: number
  w: number
  h: number
}

export interface PointCoords {
  x: number // percentage 0 to 1
  y: number
}

export interface PolygonCoords {
  points: Array<{ x: number; y: number }> // percentages 0 to 1
}

export type AnnotationCoords = BBoxCoords | PointCoords | PolygonCoords

export interface MessageReaction {
  emoji: string
  count: number
  users: string[] // user IDs or usernames
}

export interface Message {
  id: string
  annotation_id: string
  author_id: string
  author_name: string
  content: string
  created_at: string
  reactions?: Record<string, string[]> // emoji -> user ids
}

export interface Annotation {
  id: string
  descriptor_id: string
  type: AnnotationType
  coords: AnnotationCoords
  title: string
  description?: string
  tags: string[]
  estimate_points?: number
  estimate_source?: 'manual' | 'ai_suggestion'
  suggested_assignee?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  css_selector?: string
  xpath?: string
  status: AnnotationStatus
  owner_id?: string
  created_at: string
  updated_at: string
  messages: Message[]
  votes?: {
    yes: number
    no: number
    votedBy?: Record<string, 'yes' | 'no'>
  }
}

export interface Collaborator {
  id: string
  descriptor_id: string
  user_id: string
  email?: string
  role: 'viewer' | 'editor' | 'admin'
  accepted_at?: string
  created_at: string
}

export interface DescriptorImage {
  url: string // base64 data url or public storage url
  name: string
  width: number
  height: number
  version: number
  path?: string // storage bucket path if stored in Supabase
}

export interface Descriptor {
  id: string
  owner_id: string
  owner_name?: string
  title: string
  image: DescriptorImage
  annotations: Annotation[]
  collaborators?: Collaborator[]
  metadata?: {
    createdBy?: string
    createdAt?: string
    notes?: string
    [key: string]: any
  }
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  name: string
  avatar_url?: string
}

export type ViewTool = 'select' | 'bbox' | 'point' | 'polygon' | 'pan' | 'heatmap' | 'measure'

