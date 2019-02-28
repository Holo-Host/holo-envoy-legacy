

export type Instance = {
  id: string
}

export type HappID = string

export type CallRequest = {
  agentId: string,
  happId: HappID,
  dnaHash: string,
  function: string,
  params: any,
  signature: string,
}

export type CallResponse = any

// export type AdminUiInstallRequest = {
//   id: string,
//   root_dir: string
// }
