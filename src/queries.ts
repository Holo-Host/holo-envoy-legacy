
type ResponseLookupHoloApp = {
  dnaLocators: Array<string>,
  uiLocator: string,
}

export const lookupHoloApp = ({}): ResponseLookupHoloApp => {
  return {
    dnaLocators: ['http://localhost:3333/dna.json'],
    uiLocator: 'http://localhost:3333/ui.json',
  }
}

export const lookupInstance = async (client, {dna, agent}) => {
  const instances = await client.call('info/instances')
  console.log('all instances: ', instances)
  return instances.find(inst => inst.dna === dna && inst.agent === agent) || null
}


export const callConductor = (client, {id, zome, func, params}) => {
  return client.call(`${id}/${zome}/${func}`, params)
}
