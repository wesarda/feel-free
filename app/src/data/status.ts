/** State of one data source, shown in the status banner and the "About the data" dialog. */
export type SourceState = 'loading' | 'live' | 'cached' | 'unavailable' | 'sample' | 'local'

export type SourceStatus = {
  source: string
  state: SourceState
  /** When the data shown was fetched from the source. */
  fetchedAt?: string
  count?: number
  detail?: string
}
