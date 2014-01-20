# Fluent Helper For Integration Testing 7digital API client Applications

*This is heavily under development and we make no guarantees of API stability- 
use at your own risk *

A helper package which spins up an API stub as a child process and allows you
to fluently configure the behaviour of the stub from with in your unit tests.

```javascript

	describe('stub', function () {
		it('stubs endpoints', function (done) {
			stub(
				listeningOn(port),
				aCallTo(basket, 'get')
					.withTheFollowingParameters({ basketId: 'blah' })
					.respondsWithFile(fakeResponsePath),
				aCallTo(release, 'getDetails')
					.withTheFollowingParameters({ releaseId: 12345})
					.respondsWithErrorCode(90210)
			).run(function (kill) {
				killer = kill;
				basket.get({ basketId: 'blah' }, function (err, faked) {
					isFake(err, faked);

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


```


