
export type LookupHappResponse = {
  dnaLocators: Array<string>,
  uiLocator: string,
}

export type Instance = {
  id: string
}

export type HappID = string

export type CallRequest = {
  agent: string,
  happ: HappID,
  dna: string,
  function: string,
  params: any
}

export type CallResponse = any

// export type AdminUiInstallRequest = {
//   id: string,
//   root_dir: string
// }