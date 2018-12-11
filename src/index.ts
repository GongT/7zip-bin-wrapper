import { IToRun, processPromise, processQuitPromise, spawn7z } from './lib/fork';
import { handleOutput, handleProgress, IStatusReport } from './lib/outputStreams';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';

export class I7zHandler extends EventEmitter {
	private _promise: Promise<void>;
	private _timer: NodeJS.Immediate;
	private cp: ChildProcess;

	constructor(
		private readonly toRun: IToRun,
	) {
		super();

		this._timer = setImmediate(() => {
			delete this._timer;
			this._start();
		});
	}

	private _start() {
		console.error('---------------');
		if (this._promise) {
			return;
		}
		this.hold();
		this.cp = this.toRun.execute();

		handleOutput(this.cp.stdout).on('data', (data: string) => {
			this.emit('output', data);
		});
		handleProgress(this.cp.stderr).on('data', (status: IStatusReport) => {
			this.emit('progress', status);
		});

		this._promise = processPromise(this.cp, this.commandline, this.cwd);
	}

	on(event: 'progress', cb: (progress: IStatusReport) => void): this;
	on(event: 'output', cb: (data: string) => void): this;
	on(event: string, cb: (...args: any[]) => void): this {
		return super.on(event, cb);
	}

	hold() {
		if (this._promise) {
			throw new Error('You cannot hold after leaved the event loop which created this object.');
		}
		if (this._timer) {
			clearImmediate(this._timer);
			delete this._timer;
		}
	}

	async cancel(): Promise<void> {
		if (this._promise) {
			return processQuitPromise(this.cp);
		} else {
			return this.hold();
		}
	}

	public get commandline() {
		return this.toRun.commandline;
	}

	public get cwd() {
		return this.toRun.cwd;
	}

	promise(): Promise<void> {
		if (!this._promise) {
			this._start();
		}
		return this._promise;
	}
}

function _7Zip(cli: boolean, args: string[]): I7zHandler {
	return new I7zHandler(spawn7z(args, false));
}

export function sevenZip(...args: string[]) {
	return _7Zip(false, args);
}

export function sevenZipCli(...args: string[]) {
	return _7Zip(true, args);
}

export function extract(zipFile: string, targetDir: string) {
	return _7Zip(false, ['x', `-o${targetDir}`, '-y', zipFile]);
}

const defaultZipArgs = [
	'-y',
	'-ms=on', // create solid archive (default)
	'-mx8', // more compress
	'-mmt', // multithread the operation (faster)
	'-ssc', // case-sensitive mode
];

export function compress(zipFile: string, sourceDir: string, ...extraSource: string[]) {
	return _7Zip(false, ['a', ...defaultZipArgs, zipFile, sourceDir, ...extraSource]);
}
