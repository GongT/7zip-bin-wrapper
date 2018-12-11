import { Transform } from 'stream';
import { decodeStream } from 'iconv-lite';
import { platform } from 'os';
import split2=require('split2')

const isWin = platform() === 'win32';

function transformOutputEncode(source: NodeJS.ReadableStream): NodeJS.ReadableStream {
	return isWin? source.pipe(decodeStream('936')) : source;
}

class BackspaceNewlineStream extends Transform {
	_transform(chunk: Buffer, encoding: string, callback: Function): void {
		const str = chunk.toString('utf8').replace(/[\x08\x0d]+/g, '\n').replace(/^ +| +$/g, '');
		this.push(str, 'utf8');
		callback();
	}
}

class FilterStream extends Transform {
	constructor() {
		super({ objectMode: true });
	}

	_transform(chunk: Buffer | string, encoding: string, callback: Function): void {
		if (typeof chunk !== 'string') {
			chunk = chunk.toString(encoding);
		}
		chunk = chunk.trim();
		if (chunk.length) {
			this.push(chunk);
		}
		callback();
	}
}

const matchExp = /^(\d+%)(?: - )?(.*)$/;

export interface IStatusReport {
	progress: number;
	message: string;
}

class ProgressStream extends Transform {
	constructor() {
		super({ objectMode: true });
	}

	_transform(chunk: string, encoding: string, callback: Function): void {
		const match = matchExp.exec(chunk);
		if (match) {
			const percent = parseInt(match[1]);
			if (!isNaN(percent)) {
				this.push({
					progress: percent,
					message : match[2] || '',
				} as IStatusReport);
			}
		}
		callback();
	}
}

export function handleOutput(stream: NodeJS.ReadableStream) {
	return transformOutputEncode(stream)
		.pipe(split2())
		.pipe(new FilterStream());
}

export function handleProgress(stream: NodeJS.ReadableStream) {
	return transformOutputEncode(stream)
		.pipe(new BackspaceNewlineStream())
		.pipe(split2())
		.pipe(new FilterStream())
		.pipe(new ProgressStream());
}
