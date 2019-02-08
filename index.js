/**
 * Server for Holo
 * 
 * Accepts requests similar to what the Conductor
 */


const mapRequest = req => {
	const {dnaHash, agentKey} = req

}

const lookupInstance = async ({dna, agent}) => {
	const instances = await ws.fetch('info/instances')
	instances.find(inst => inst.dna === dna && inst.agent === agent)
}