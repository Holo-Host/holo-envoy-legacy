

export type InstanceInfo = {
  agentId: string,
  dnaHash: string,
  type: InstanceType,
}

export enum InstanceType {
  Public,
  Hosted,
}

export type HappID = string

export type KeyData = {
  keyFile: string,
  publicAddress: string,
}

export interface HappStoreResource {
  location: string,
  hash: string,
  handle: string,
}

export type HappStoreUiResource = HappStoreResource
export type HappStoreDnaResource = HappStoreResource & { handle: string }

export interface HappStoreEntry {
  dnas: Array<HappStoreDnaResource>
  ui?: HappStoreUiResource
}

