

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

export type HappResource = {
  location: string,
  hash: string,
}

export interface HappEntry {
  dnas: Array<HappResource>
  ui?: HappResource | void
}

