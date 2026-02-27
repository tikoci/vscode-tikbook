/**
 * Custom Mocha reporter that writes test results to both console and a log file
 * This ensures test output is always visible, even when vscode-test captures stdout
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const Mocha = require('mocha');

const {
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
} = Mocha.Runner.constants;

class AIFriendlyReporter {
  constructor(runner, options) {
    this._indents = 0;
    const stats = runner.stats;
    let runEnded = false;

    // Open log file
    const logPath = path.join(process.cwd(), '.vscode-test', 'test-output.log');
    fs.mkdirSync(path.dirname(logPath), { recursive: true });

    const writeLine = (line, stream = 'stdout') => {
      const text = String(line ?? '');
      const lines = text.split(/\r?\n/);
      lines.forEach((entry) => {
        fs.appendFileSync(logPath, `${entry}\n`, 'utf8');
        if (stream === 'stderr') {
          process.stderr.write(`${entry}\n`);
        } else {
          process.stdout.write(`${entry}\n`);
        }
      });
    };

    const formatConsoleArgs = (args) => util.format(...args);

    const writeConsole = (stream, args) => {
      const output = formatConsoleArgs(args);
      if (output === '') {
        writeLine('', stream);
        return;
      }
      writeLine(output, stream);
    };

    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
      dir: console.dir,
      trace: console.trace,
    };

    const restoreConsole = () => {
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.debug = originalConsole.debug;
      console.dir = originalConsole.dir;
      console.trace = originalConsole.trace;
    };

    console.log = (...args) => writeConsole('stdout', args);
    console.info = (...args) => writeConsole('stdout', args);
    console.warn = (...args) => writeConsole('stderr', args);
    console.error = (...args) => writeConsole('stderr', args);
    console.debug = (...args) => writeConsole('stdout', args);
    console.dir = (obj, options) => {
      const inspected = util.inspect(obj, options || {});
      writeConsole('stdout', [inspected]);
    };
    console.trace = (...args) => {
      const message = formatConsoleArgs(args);
      const stack = new Error(message).stack || message;
      writeLine(stack, 'stderr');
    };

    const log = (msg) => {
      const output = '  '.repeat(this._indents) + msg;
      writeLine(output, 'stdout');
    };

    const writeSummary = (label) => {
      log('');
      log('='.repeat(60));
      log(label);
      log(`Passes: ${stats.passes || 0}`);
      log(`Failures: ${stats.failures || 0}`);
      log(`Pending: ${stats.pending || 0}`);
      log(`Duration: ${stats.duration}ms`);
      log('='.repeat(60));
      log('');
    };

    const maybeFailOnZeroTests = () => {
      const testCount = stats.tests || 0;
      if (testCount === 0) {
        log('WARNING: No tests were executed. Check test discovery and config.');
        process.exitCode = 1;
      }
    };

    runner
      .once(EVENT_RUN_BEGIN, () => {
        log('');
        log('='.repeat(60));
        log('TEST RUN STARTED');
        log('='.repeat(60));
      })
      .on(EVENT_SUITE_BEGIN, (suite) => {
        if (suite.title) {
          log('');
          log(`▶ ${suite.title}`);
          this._indents++;
        }
      })
      .on(EVENT_SUITE_END, (suite) => {
        if (suite.title) {
          this._indents--;
        }
      })
      .on(EVENT_TEST_PASS, (test) => {
        log(`✓ ${test.title}`);
      })
      .on(EVENT_TEST_FAIL, (test, err) => {
        log(`✗ ${test.title}`);
        log(`  ERROR: ${err.message}`);
        if (err.stack) {
          const stackLines = err.stack.split('\n').slice(1, 4); // First 3 stack lines
          stackLines.forEach(line => log(`  ${line.trim()}`));
        }
      })
      .once(EVENT_RUN_END, () => {
        runEnded = true;
        writeSummary('TEST RUN COMPLETE');
        maybeFailOnZeroTests();
        restoreConsole();
        
        // Also write summary to stdout explicitly
        process.stdout.write(`\n${'='.repeat(60)}\n`);
        process.stdout.write(`Passes: ${stats.passes || 0} | Failures: ${stats.failures || 0}\n`);
        process.stdout.write(`Log file: .vscode-test/test-output.log\n`);
        process.stdout.write(`${'='.repeat(60)}\n`);
      });

    process.once('exit', () => {
      if (!runEnded) {
        writeSummary('TEST RUN TERMINATED BEFORE COMPLETION');
        maybeFailOnZeroTests();
      }
      restoreConsole();
    });
  }
}

module.exports = AIFriendlyReporter;
