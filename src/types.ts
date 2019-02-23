
export type LookupHappRequest = {

}

export type LookupHappResponse = {
  dnaLocators: Array<string>,
  uiLocator: string,
}

export type Instance = {
  id: string
}

export type HappID = string

export type InstallHappRequest = {
  happId: HappID
}

export type CallRequest = {
  agent: string,
  happId: HappID,
  dnaHash: string,
  function: string,
  params: any
}

export type CallResponse = any

// export type AdminUiInstallRequest = {
//   id: string,
//   root_dir: string
// }