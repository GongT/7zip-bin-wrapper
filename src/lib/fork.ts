import { path7za } from '7zip-bin';
import { ChildProcess, spawn, SpawnOptions } from 'child_process';

export interface ProgramError extends Error {
	__cwd: string;
	__program: string;
	__programError: boolean;
	signal: string;
	status: number;
}

const outputArgs = [
	'-bso1', // standard output messages -> stdout
	'-bse1', // error messages -> stdout
	'-bsp2', // progress information -> stderr
];

function buildArgs(args: string[]) {
	return outputArgs.concat(args.filter((item) => {
		return !item.startsWith('-bs');
	}));
}

export type ExtraSpawnOptions = Pick<SpawnOptions, 'cwd'|'env'|'uid'|'gid'|'shell'>

export interface IToRun {
	commandline: string[]
	cwd: string;
	execute(): ChildProcess;
}

const quited = Symbol('quited');

function hasQuit(cp: ChildProcess): boolean {
	return (cp as any)[quited];
}

/** @internal */
export function spawn7z(args: string[], cli: boolean, extra: ExtraSpawnOptions = {}): IToRun {
	const cwd = extra.cwd || process.cwd();
	
	if (!cli && !args.includes('-y')) {
		args.unshift('-y');
	}
	
	args = buildArgs(args);
	
	const commandline = [path7za, ...args];
	return {
		commandline,
		cwd,
		execute() {
			const cp = spawn(
				path7za,
				args,
				{
					...extra,
					stdio: [cli? 'inherit' : 'ignore', 'pipe', 'pipe'],
					cwd,
					detached: false,
					windowsHide: true,
				},
			);
			
			cp.once('exit', () => {
				Object.assign(cp, {
					[quited]: true,
				});
			});
			
			return cp;
		},
	};
}

export function processPromise(cp: ChildProcess, cmd: string[], cwd: string) {
	return new Promise<void>((resolve, reject) => {
		cp.once('error', reject);
		cp.once('exit', (code: number, signal: string) => {
			const e = StatusCodeError(code, signal, cwd, cmd);
			if (e) {
				reject(e);
			} else {
				resolve();
			}
		});
	});
}

function indentArgs(args: ReadonlyArray<string>) {
	return args.map((arg, index) => {
		return `  Argument[${index}] = ${arg}`;
	}).join('\n');
}

export function StatusCodeError(status: number, signal: string, cwd: string, cmd: string[]): ProgramError {
	if (status === 0 && !signal) {
		return null;
	}
	const __program = `\`${cmd.join(' ')}\`
    Command = ${cmd[0]}
${indentArgs(cmd.slice(1))}
`;
	return Object.assign(new Error(
		signal? `Program exit by signal "${signal}"` : `Program exit with code "${status}"`,
	), {
		status, signal,
		__programError: true,
		__program,
		__cwd: cmd[2],
	});
}

export function processQuitPromise(cp: ChildProcess): Promise<void> {
	if (hasQuit(cp)) {
		return Promise.resolve();
	}
	return new Promise((resolve, reject) => {
		const to = setTimeout(() => {
			cp.kill('sigkill');
		}, 5000);
		cp.once('exit', (_, signal: string) => {
			clearTimeout(to);
			resolve();
		});
		cp.kill('sigint');
	});
}
