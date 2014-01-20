### Fluent Helper For Integration Testing 7digital API client Applications

**This is under development and we make no guarantees of API stability- 
use at your own risk**

A helper package which spins up an API stub as a child process and allows you
to fluently configure the behaviour of the stub from with in your integration tests.

```javascript
var stub = require('7digital-api-stubber').stub;
var aCallTo = require('7digital-api-stubber').aCallTo;
var listeningOn = require('7digital-api-stubber').listeningOn;
var schema = require('7digital-api/assets/7digital-api-schema.json');
schema.host = 'localhost';
schema.port = port;
schema.version = '';
var api = require('7digital-api').configure({
	schema: schema
});
var basket = new api.Basket();
var release = new api.Releases();

describe('Using the stubber', function () {
	it('stubs endpoints', function (done) {
		stub(
			listeningOn(3001),
			aCallTo(basket, 'get')
				.withTheFollowingParameters({ basketId: 'blah' })
				.respondsWithFile(fakeResponsePath),
			aCallTo(release, 'getDetails')
				.withTheFollowingParameters({ releaseId: 12345})
				.respondsWithErrorCode(90210)
		).run(function (kill) {
			// Do stuff with a stub setup for you - E.g.
			basket.get({ basketId: 'blah' }, function (err, faked) {
				assert(!err);
				
				release.getDetails({ releaseId: 12345 }, function (err, faked) {
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


