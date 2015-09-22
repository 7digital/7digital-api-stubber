'use strict';
var ApiHttpError = require('7digital-api/lib/errors').ApiHttpError;
var path = require('path');
var assert = require('chai').assert;
var port = Math.floor(Math.random() * 16383 + 49152);
var fakeResponsePath = path.join(__dirname, 'fake-response.xml');
var withClient = require('../').withClient;
var aCallTo = require('../').aCallTo;
var listeningOn = require('../').listeningOn;
var api;
require('../').createClient({}, function(err, client) {
	api = client;
});

describe('stubber', function () {
	var killer = function () {};

	function isFake(err, faked) {
		assert(!err, 'expected no error');
		assert(faked, 'expected a response');
		assert.equal(faked.resource.foo, 'Some fake data',
			'expected the response to match the fake response');
	}

	afterEach(function () {
		killer();
	});

	describe('aCallTo - with no parameters', function  () {
		it('generates a response with file rule', function () {
			var message = aCallTo(api.Basket, 'create')
							.respondsWithFile(fakeResponsePath);

			assert.deepEqual(message, {
				rules: {
					urls: {
						'/basket/create': {
							serveFile: fakeResponsePath
						}
					}
				}
			});
		});

		it('generates a response with error rule', function () {
			var message = aCallTo(api.Basket, 'create')
							.respondsWithErrorCode(90210);

			assert.deepEqual(message, {
				rules: {
					urls: {
						'/basket/create': {
							returnError: 90210
						}
					}
				}
			});
		});

		it('generates a rewrite rule', function () {
			var message = aCallTo(api.Basket, 'create')
							.rewritesTo('http://rewrittenurl.com/');

			assert.deepEqual(message, {
				rules: {
					urls: {
						'/basket/create': {
							rewriteTo: 'http://rewrittenurl.com/'
						}
					}
				}
			});
		});
	});

	describe('aCallTo - with parameters', function  () {
		it('generates a response with file rule', function () {
			var message = aCallTo(api.Releases, 'getDetails')
							.withTheFollowingParameters({ releaseId: 12345 })
							.respondsWithFile(fakeResponsePath);

			assert.deepEqual(message, {
				rules: {
					urls: {
						'/release/details?releaseId=12345': {
							serveFile: fakeResponsePath
						}
					}
				}
			});
		});

		it('generates a response with error rule', function () {
			var message = aCallTo(api.Releases, 'getDetails')
							.withTheFollowingParameters({ releaseId: 12345 })
							.respondsWithErrorCode(90210);

			assert.deepEqual(message, {
				rules: {
					urls: {
						'/release/details?releaseId=12345': {
							returnError: 90210
						}
					}
				}
			});
		});

		it('generates a rewrite rule', function () {
			var message = aCallTo(api.Releases, 'getDetails')
							.withTheFollowingParameters({ releaseId: 12345 })
							.rewritesTo('http://rewrittenurl.com/');

			assert.deepEqual(message, {
				rules: {
					urls: {
						'/release/details?releaseId=12345': {
							rewriteTo: 'http://rewrittenurl.com/'
						}
					}
				}
			});
		});

		it('generates a form data file rule', function () {
			var formData = { emailAddress: 'some-email' };
			var message = aCallTo(api.User, 'authenticate')
							.withFormData(formData)
							.respondsWithFile(fakeResponsePath);

			assert.deepEqual(message, {
				rules: {
					urls: {
						'/user/authenticate': {
							formData: formData,
							serveFile: fakeResponsePath
						}
					}
				}
			});
		});

		it('generates a url slug file rule', function () {
			var slugs = { id: 'some-id' };
			var message = aCallTo(api.Users, 'update')
							.withSlugs(slugs)
							.respondsWithFile(fakeResponsePath);

			assert.deepEqual(message, {
				rules: {
					urls: {
						'/users/some-id/update': {
							serveFile: fakeResponsePath
						}
					}
				}
			});
		});
	});

	describe('stub', function () {
		it('stubs querystring endpoints', function (done) {
			withClient(api).stub(aCallTo(api.Basket, 'get')
					.withTheFollowingParameters({ basketId: 'blah' })
					.respondsWithFile(fakeResponsePath),
				aCallTo(api.Releases, 'getDetails')
					.withTheFollowingParameters({ releaseId: 12345})
					.respondsWithErrorCode(90210)
			).run(function (kill) {
				killer = kill;
				var basket = new api.Basket();
				var release = new api.Releases();

				basket.get({ basketId: 'blah' }, function (err, faked) {
					isFake(err, faked);

					release.getDetails({ releaseId: 12345 }, function (err, faked) {
						assert(err, 'expected an error');
						assert.equal(err.code, 90210,
							'expected error code to match stubbed value');
						done();
					});
				});
			});
		});

		it('responds with HTTP error codes', function(done) {
			withClient(api).stub(aCallTo(api.Basket, 'get')
				.withTheFollowingParameters({ basketId: 'basketId' })
				.respondsWithHttpErrorCode(500))
				.run(function (kill) {
					killer = kill;

					new api.Basket().get({basketId: 'basketId'}, function (err, basket) {
						assert.instanceOf(err, ApiHttpError);
						assert.equal(err.statusCode, 500);
						done();
					});
				});
		});

		it('stubs form data endpoints', function (done) {
			withClient(api).stub(aCallTo(api.User, 'authenticate')
					.withFormData({ emailAddress: 'email' })
					.respondsWithFile(fakeResponsePath)
			).run(function (kill) {
				killer = kill;

				api.User().authenticate({ emailAddress: 'email' }, function (err, faked) {
					isFake(err, faked);

					api.User().authenticate({}, function (err, faked) {
						assert(err, 'expected an error');
						done();
					});
				});
			});
		});
	});
});
