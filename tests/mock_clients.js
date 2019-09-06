
const sprintf			= require('sprintf-js').sprintf;

// Should this be a generic RPC WebSocket client mock, or specifically a Holochain client mock?
class MockClient {

    static __default__ = Symbol('MockClient_default');

    constructor ( response_map ) {
	this.responses		= response_map;
	this.processors		= [];
    }

    intercept ( fn ) {
	this.processors.push( fn );
    }
    
    async call ( method, payload ) {
	
	for ( let fn of this.processors ) {
	    const result	= await fn.apply( this, arguments );

	    if ( result !== undefined )
		return result;
	}
	
	if ( method in this.responses ) {
	    return this.responses[ method ];
	}
	else if ( MockClient.__default__ in this.responses ) {
	    return this.responses[ MockClient.__default__ ];
	}

	throw new Error(sprintf("No response is configured for method %s: %s", method, payload ));
    }
};

module.exports = MockClient;
