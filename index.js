var querystring = require('querystring');
var path = require('path');
var cp = require('child_process');
var api = require('7digital-api');
var stubs = [];

function getApiUrl(ctx) {
	var apiInstance = new ctx.apiInstance();

	var apiClient = apiInstance.api;
	checkIsStubClient(apiClient);

	if (ctx.params) {
		return apiInstance.api.formatPath(apiInstance.resourceName,
			apiInstance[ctx.apiMethod].action) + '?' +
			querystring.stringify(ctx.params);
	}

	return apiInstance.api.formatPath(apiInstance.resourceName,
			apiInstance[ctx.apiMethod].action);
}

function createMessage(ctx, ruleType, ruleDetails) {
	if (!ruleDetails) { throw new Error('Missing ruleDetails'); }

	var url = getApiUrl(ctx);
	var message = { rules: { urls: {} } };
	var rule= {};
	rule[ruleType] = ruleDetails;
	message.rules.urls[url] = rule;

	return message;
}

function aCallTo(apiInstance, apiMethod) {
	var ctx = {
		apiInstance: apiInstance,
		apiMethod: apiMethod,
	};

	return {

		// Helper to build up the url
		withTheFollowingParameters: function withTheFollowingParameters(p) {
			ctx.params = p;
			return this;
		},
		// Terminator which returns the message to send to the stub
		respondsWithFile: function respondsWithFile(path) {
			return createMessage(ctx, 'serveFile', path);
		},
		respondsWithErrorCode: function respondsWithErrorCode(statusCode) {
			return createMessage(ctx, 'returnError', statusCode);
		},
		rewritesTo: function rewritesTo(destination) {
			return createMessage(ctx, 'rewriteTo', destination);
		}
	};
}

function killStub(apiStub) {
	if (apiStub && apiStub.connected === true) {
		return apiStub.kill('SIGKILL');
	}
}

function killAllStubsAndDie() {
	stubs.map(killStub);
	process.exit(0);
}

process.once('SIGINT', killAllStubsAndDie);
process.once('SIGTERM', killAllStubsAndDie);

function stub() {
	var messages = [].slice.call(arguments);
	var api = this.client;

	return {
		run: function (cb) {
			var options = { env: { PORT: api.schema.port }, silent: true };
			var apiStub = cp.fork(path.join(__dirname, '..', 'api-stub',
				'server.js'), [], options),
				acknowledgements = 0;
			stubs.push(apiStub);

			function killIfConnected() {
				killStub(apiStub);
			}

			apiStub.stderr.pipe(process.stderr);

			if (messages.length === 0) {
				return apiStub.on('message', function (message) {
					if (message.ready === true) {
						return cb(killIfConnected);
					}
				});
			}

			messages.forEach(function (message) {
				apiStub.send(message);
			}, apiStub);

			apiStub.on('message', function (message) {
				if (message.rules) {
					++acknowledgements;
					if (acknowledgements === messages.length) {
						cb(killIfConnected);
					}
				}
			});
		}
	};
}

function createClient() {
	var schema = require('7digital-api/assets/7digital-api-schema.json');
	var port = 3001;

	schema.host = 'localhost';
	schema.port = port;
	schema.version = undefined;

	var api = require('7digital-api').configure({
		schema: schema
	});

	api.IS_STUB_CLIENT = true;

	return api;
}

function checkIsStubClient(client) {
	if (!client.IS_STUB_CLIENT) {
		throw new Error('Expected stub client, created with createClient');
	}
}

function withClient(client) {
	checkIsStubClient(client);

	return {
		stub: stub.bind({ client: client })
	};
}

module.exports.withClient = withClient;
module.exports.aCallTo = aCallTo;
module.exports.createClient = createClient;