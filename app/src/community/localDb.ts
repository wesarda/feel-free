import type { Comment, Photo } from './types'

/*
 * Comments and photos written in this browser: the only copy in local mode, and the author's view
 * of their own content waiting for moderation in server mode. IndexedDB, because photos are large.
 */

const DB_NAME = 'kbb-community'
type StoreName = 'comments' | 'photos'

let opening: Promise<IDBDatabase | null> | null = null
const memory: Record<StoreName, Map<string, Comment | Photo>> = { comments: new Map(), photos: new Map() }

function open(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        for (const name of ['comments', 'photos'] as const) {
          const store = request.result.createObjectStore(name, { keyPath: 'id' })
          store.createIndex('placeId', 'placeId')
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      // Private mode or no IndexedDB: keep this session's items in memory
      resolve(null)
    }
  })
  return opening
}

async function byPlace<T extends Comment | Photo>(name: StoreName, placeId: string): Promise<T[]> {
  const db = await open()
  if (!db) return [...memory[name].values()].filter((x) => x.placeId === placeId) as T[]
  return new Promise((resolve) => {
    const request = db.transaction(name).objectStore(name).index('placeId').getAll(placeId)
    request.onsuccess = () => resolve(request.result as T[])
    request.onerror = () => resolve([])
  })
}

async function put(name: StoreName, item: Comment | Photo): Promise<void> {
  const db = await open()
  if (!db) {
    memory[name].set(item.id, item)
    return
  }
  await new Promise<void>((resolve) => {
    const tx = db.transaction(name, 'readwrite')
    tx.objectStore(name).put(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

export const localDb = {
  comments: (placeId: string) => byPlace<Comment>('comments', placeId),
  photos: (placeId: string) => byPlace<Photo>('photos', placeId),
  putComment: (comment: Comment) => put('comments', comment),
  putPhoto: (photo: Photo) => put('photos', photo),
}
