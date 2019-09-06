
const sprintf			= require('sprintf-js').sprintf;

//
// Generic RPC WebSocket mock client
//
// This is a ultra-light class to simulate the RPC WebSocket Client API.  It does not attempt to
// create any real connections.
//
// You can define responses, or use the `intercept` method to add middleware.  Middleware can
// optionally return a response which will immediately return to the client, otherwise it will
// continue to the next middleware.  If no middleware returns a response, it will check defined
// responses.  All middleware is expected to be async (meaning the function must return a Promise).
//
// `MockClient.__default__` is a special symbol to define the default response.  When a call is made
// to an undefined method and there is no default response it will throw an Error.
//
//
// Example of defined default response
// ```
// const client = new MockClient({
//     [ MockClient.__default__ ]: "default response",
// });
// ```
//
// Example of defined responses
// ```
// const client = new MockClient({
//     "method": "method response",
//     "another_method": "another method response",
// });
// ```
// 
// Example of intercept middleware
// ```
// client.intercept( async function ( method, payload ) {
//     ...
// });
//
//
// Full example
// ```
// const client = new MockClient({
//     [ MockClient.__default__ ]: "default response",
//     "method": "method response",
//     "another_method": "another method response",
// });
// 
// client.intercept( async function ( method, payload ) {
//     if ( method === "something" )
//         return "something response";
// });
// 
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
