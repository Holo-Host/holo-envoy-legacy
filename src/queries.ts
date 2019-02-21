
type ResponseLookupHoloApp = {
  dnaLocators: Array<string>,
  uiLocator: string,
}

type Instance = {
  id: string
}

export const lookupHoloApp = ({}): ResponseLookupHoloApp => {
  return {
    dnaLocators: ['http://localhost:3333/dna.json'],
    uiLocator: 'http://localhost:3333/ui.json',
  }
}

export const lookupInstance = async (client, {dna, agent}): Promise<Instance | null> => {
  const instances = await client.call('info/instances')
  console.log('all instances: ', instances)
  return instances.find(inst => inst.dna === dna && inst.agent === agent) || null
}

/**
 * Makes a direct call to the conductor based on instance ID
 */
export const callConductor = (client, {id, function: func, params}) => {
  return client.call(`${id}/${func}`, params)
}
