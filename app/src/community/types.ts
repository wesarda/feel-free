/*
 * Comments and photos added by people. Shared by the browser and the API functions in app/api,
 * so both sides agree on the shape.
 */

export type Experience = 'ok' | 'partial' | 'barrier'

/** approved: public · pending: waits for moderation, visible only to its author · rejected: not published */
export type ModerationStatus = 'approved' | 'pending' | 'rejected'

export type Moderation = {
  status: ModerationStatus
  /** Who decided: the AI model, simple rules (links, phone numbers…), or nobody yet. */
  by: 'ai' | 'rules' | 'none'
  reason?: string
  model?: string
}

export type PhotoFacts = {
  entranceSteps: number | null
  ramp: boolean | null
  handrail: boolean | null
  automaticDoor: boolean | null
  levelEntrance: boolean | null
}

export type Comment = {
  id: string
  placeId: string
  text: string
  /** Optional signature; comments are anonymous otherwise. */
  nick?: string
  /** "Was it accessible for you?" */
  experience?: Experience
  createdAt: string
  moderation: Moderation
  /** Set in this browser for comments written here. */
  mine?: boolean
}

export type Photo = {
  id: string
  placeId: string
  /** Image address: /api/photo?id=… on the server, a data: URL for photos kept in this browser. */
  url: string
  width: number
  height: number
  caption?: string
  createdAt: string
  moderation: Moderation
  /** What the AI saw on the photo; shown as unverified information. */
  description?: string
  facts?: PhotoFacts
  mine?: boolean
}

/** Photo from an open source (Wikimedia Commons, a link in OpenStreetMap), with attribution. */
export type ExternalPhoto = {
  id: string
  url: string
  thumb: string
  author?: string
  license?: string
  sourceName: string
  sourceUrl: string
}

export type NewComment = { placeId: string; text: string; nick?: string; experience?: Experience; lang: string }

export type NewPhoto = {
  placeId: string
  placeName: string
  category: string
  /** JPEG as a data: URL, already resized and stripped of EXIF in the browser. */
  image: string
  width: number
  height: number
  caption?: string
  lang: string
}

export type ApiHealth = { ok: boolean; store: string | null; ai: boolean }

export const LIMITS = {
  commentMin: 3,
  commentMax: 1000,
  nickMax: 40,
  captionMax: 200,
  /** Decoded image size accepted by the API. */
  photoBytes: 2_500_000,
} as const

export const PLACE_ID = /^[a-z0-9-]{3,80}$/
