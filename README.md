### Fluent Helper For Integration Testing 7digital API client Applications

**This is under development and there are likely to be breaking changes 
without warning**

A helper package which spins up an API stub as a child process and allows you
to fluently configure the behaviour of the stub from with in your integration
tests.

```javascript
var stub = require('7digital-api-stubber').stub;
var aCallTo = require('7digital-api-stubber').aCallTo;
var listeningOn = require('7digital-api-stubber').listeningOn;
var createStubClient = require('7digital-api-stubber').createClient;
var schema = require('7digital-api/assets/7digital-api-schema.json');

describe('Using the stubber', function () {
	var api;

	before(function (done) {
		createStubClient(function (err, client) {
			if (err) { return done(err); }
			api = client;
			done();
		});
	});

	it('stubs endpoints', function (done) {
		withClient(api).stub(
			aCallTo(api.Basket, 'get')
				.withTheFollowingParameters({ basketId: 'blah' })
				.respondsWithFile('/path/to/response.xml'),
			aCallTo(api.Release, 'getDetails')
				.withTheFollowingParameters({ releaseId: 12345})
				.respondsWithErrorCode(90210)
		).run(function (kill) {
			// Do stuff with a stub setup for you - E.g.
			api.Basket().get({ basketId: 'blah' }, function (err, faked) {
				assert(!err);
				
				api.Release().getDetails({ releaseId: 12345 },
					function (err, faked) {

					assert(err, 'expected an error');
					assert.equal(err.code, 90210,
						'expected error code to match stubbed value');
					kill();
					done();
				});
			});
		});
	});
});

```


