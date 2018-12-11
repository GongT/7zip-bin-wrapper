# 7zip-bin-wrapper

Wrapper script for [7zip-bin](https://www.npmjs.com/package/7zip-bin)

Parsing output from 7za, create progress etc.

## Define:
```typescript
interface IStatusReport {
	progress: number; // 0 ~ 100
	message: string;
}

interface TheHandler {
	on(event: 'progress', cb: (progress: IStatusReport) => void): this;
	on(event: 'output', cb: (data: string) => void): this;
	/** by default, 7z will run, but you can use hold() to prevent it */
	hold(): void;
	/** terminate 7z process */
	cancel(): Promise<void>;
	/** command line to run */
	readonly commandline: string[];
	/** 7z's cwd */
	readonly cwd: string;
	/** wait process complete */
	promise(): Promise<void>;
}
```

## Usage:
```typescript
import { sevenZip, sevenZipCli, extract, compress } from "7zip-bin-wrapper";

let handler: TheHandler;

// run raw command
handler = sevenZip('x', 'xxx.7z');
// run raw command, with spawn Option
handler = sevenZip({ cwd: "/tmp" }, 'x', 'xxx.7z');

// auto add -y to 7z, and detach input
handler = sevenZipCli('x', 'xxx.7z'); 

handler = extract('xxx.7z', 'some/where/else');
handler = compress('xxx.7z', 'to/include/', 'another/include/')
```
