
const { Client }		= require('rpc-websockets');

const args			= process.argv.slice(2);

const PORT			= args.length < 3 ? 1111 : 2222;
const client			= new Client(`ws://localhost:${PORT}`);

client.once('open', async () => {

    try {
	if ( args.length === 1 ) {
	    const cmd			= args[0];
	    const data			= await client.call( cmd );
	    
	    console.log( JSON.stringify( data, null, 4 ) );
	    client.close();
	}
	else if ( args.length === 2 ) {
	    const [cmd,params]		= args;
	    const data			= await client.call( cmd, params ? JSON.parse(params) : undefined );
	    
	    console.log( JSON.stringify( data, null, 4 ) );
	    client.close();
	}
	else if ( args.length === 3 || args.length === 4 ) {
	    const [inst,zome,func]	= args;
	    const params		= args[3] ? JSON.parse( args[3] ) : {};
	    console.log("Calling", inst, zome, func, params);
	    const data			= await client.call('call', {
		"instance_id":	inst,
		"zome":		zome,
		"function":	func,
		"args":		params,
	    });
	    
	    console.log( JSON.stringify( JSON.parse(data), null, 4 ) );
	    client.close();
	}
	else {
	    console.error("Unknown command", args);
	    client.close();
	}
    } catch (err) {
	console.error( err );
	client.close();
    }
});
