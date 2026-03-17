const test = require("node:test");
const assert = require("node:assert/strict");

const {
	buildHeaderPresentation,
	computePollDelayMs,
	createHealthPoller,
} = require("./health-indicators.js");

function flushAsync() {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

test("buildHeaderPresentation gera badge e tooltip coerentes", () => {
	const view = buildHeaderPresentation({
		status: "degraded",
		checks: {
			db: { status: "healthy" },
			model: { status: "degraded" },
			disk: { status: "healthy" },
		},
		latencyMs: 920,
		alerts: ["latencia elevada"],
	});

	assert.equal(view.badgeText, "Saude: Degradado");
	assert.match(view.badgeClassName, /amber/);
	assert.match(view.badgeTitle, /DB: healthy/);
	assert.match(view.badgeTitle, /latencia elevada/);
	assert.equal(view.latencyText, "Latencia: 920ms");
	assert.match(view.latencyClassName, /amber/);
});

test("computePollDelayMs aplica backoff com teto", () => {
	assert.equal(computePollDelayMs(0, 30000, 300000), 30000);
	assert.equal(computePollDelayMs(1, 30000, 300000), 60000);
	assert.equal(computePollDelayMs(2, 30000, 300000), 120000);
	assert.equal(computePollDelayMs(10, 30000, 300000), 300000);
});

test("createHealthPoller usa backoff e volta ao intervalo base apos sucesso", async () => {
	const queue = [];
	const cycles = [];
	const results = [false, false, true];

	const poller = createHealthPoller({
		checkHealth: async () => results.shift(),
		schedule: (fn, delay) => {
			queue.push({ fn, delay });
			return queue.length;
		},
		clear: () => {},
		baseIntervalMs: 30000,
		maxIntervalMs: 300000,
		onCycle: (info) => cycles.push(info),
	});

	poller.start();
	await flushAsync();
	assert.equal(cycles[0].ok, false);
	assert.equal(cycles[0].delayMs, 60000);

	await queue.shift().fn();
	await flushAsync();
	assert.equal(cycles[1].ok, false);
	assert.equal(cycles[1].delayMs, 120000);

	await queue.shift().fn();
	await flushAsync();
	assert.equal(cycles[2].ok, true);
	assert.equal(cycles[2].delayMs, 30000);

	poller.stop();
});
