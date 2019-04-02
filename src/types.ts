

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

// export type AdminUiInstallRequest = {
//   id: string,
//   root_dir: string
// }
