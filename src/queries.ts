import axios from 'axios'
import * as fs from 'fs'
import tar from 'tar-fs'


type ResponseLookupHoloApp = {
  dnaLocators: Array<string>,
  uiLocator: string,
}

type Instance = {
  id: string
}

type HappID = string

type CallRequest = {
  agent: string,
  happ: HappID,
  dna: string,
  function: string,
  params: any
}

type CallResponse = any

export const lookupHoloApp = ({}): ResponseLookupHoloApp => {
  // TODO: make actual call to HHA
  // this is a dummy response for now
  // assuming DNAs are served as JSON packages
  // and UIs are served as ZIP archives
  return {
    dnaLocators: ['http://localhost:3333/dna.json'],
    uiLocator: 'http://localhost:3333/ui.zip',
  }
}

export const installApp = client => async ({}) => {
  const {dnaLocators, uiLocator} = await lookupHoloApp({})
  let ui = await axios.get(uiLocator)
  let dnas = await Promise.all(dnaLocators.map(loc => axios.get(loc)))
}

/**
 * TODO: save payload of UI/DNA fetch from HCHC, for installing
 * @type {[type]}
 */
const saveTempFile = () => {}

const bundleUi = (input, target) => 
  tar.pack(input).pipe(fs.createWriteStream(target))

const unbundleUi = (input, target) => 
  fs.createReadStream(input).pipe(tar.extract(target))


export const lookupInstance = client => async ({dna, agent}): Promise<Instance | null> => {
  const instances = await client.call('info/instances')
  console.log('all instances: ', instances)
  return instances.find(inst => inst.dna === dna && inst.agent === agent) || null
}

export const holoCall = client => async ({agent, happ, dna, function: func, params}: CallRequest) => {
  let instance = await lookupInstance(client)({dna, agent})
  console.log('instance found: ', instance)
  if (instance) {
    const result = await callConductor(client)({
      id: instance.id,
      function: func, 
      params,
    })
    console.log('result: ', result)
    return result
  } else {
    return errorResponse("No instance found")
  }
}

/**
 * Makes a direct call to the conductor based on instance ID
 */
export const callConductor = client => ({id, function: func, params}): CallResponse => {
  return client.call(`${id}/${func}`, params)
}

const errorResponse = msg => ({
  error: msg
})