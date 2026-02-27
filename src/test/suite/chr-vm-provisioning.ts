import axios from 'axios';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { fetchCHRReleases } from '../../remote';
import { UTMProvider } from '../../vm-providers/utm-provider';

const execFileAsync = promisify(execFile);

export interface ProvisionedCHRVM {
	name: string;
	version: string;
	architecture: 'aarch64' | 'x86_64';
	backend: 'qemu';
	downloadUrl: string;
	wasCreated: boolean;
}

export interface EnsureQemuVMOptions {
	preferredVersion?: string;
	candidateVersions?: string[];
	forceCreate?: boolean;
	logger?: (message: string) => void;
}

function hostToCHRArchitecture(): 'aarch64' | 'x86_64' {
	return os.arch() === 'arm64' ? 'aarch64' : 'x86_64';
}

function walkForFirstUtmBundle(dirPath: string): string | null {
	const entries = fs.readdirSync(dirPath, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory() && entry.name.endsWith('.utm')) {
			return fullPath;
		}
	}
	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}
		const nested = walkForFirstUtmBundle(path.join(dirPath, entry.name));
		if (nested) {
			return nested;
		}
	}
	return null;
}

async function findRunningQemuVMName(): Promise<string | null> {
	const script = `
		tell application "UTM"
			repeat with vm in virtual machines
				set vmName to name of vm as string
				set vmStatus to (get status of vm) as string
				set vmBackend to (backend of vm) as string
				if vmBackend is "qemu" and vmStatus is "started" then
					return vmName
				end if
			end repeat
			return ""
		end tell
	`;
	const { stdout } = await execFileAsync('osascript', ['-e', script], { timeout: 15000 });
	const vmName = stdout.trim();
	return vmName.length > 0 ? vmName : null;
}

async function findStoppedQemuVMName(): Promise<string | null> {
	const script = `
		tell application "UTM"
			repeat with vm in virtual machines
				set vmName to name of vm as string
				set vmStatus to (get status of vm) as string
				set vmBackend to (backend of vm) as string
				if vmBackend is "qemu" and vmStatus is "stopped" then
					return vmName
				end if
			end repeat
			return ""
		end tell
	`;
	const { stdout } = await execFileAsync('osascript', ['-e', script], { timeout: 15000 });
	const vmName = stdout.trim();
	return vmName.length > 0 ? vmName : null;
}

let cachedProvision: ProvisionedCHRVM | null = null;

export async function ensureRunningQemuCHRVM(options: EnsureQemuVMOptions = {}): Promise<ProvisionedCHRVM> {
	const log = options.logger ?? (() => undefined);
	const provider = new UTMProvider();
	const architecture = hostToCHRArchitecture();

	if (!(await provider.isAvailable())) {
		throw new Error('UTM is not available on this machine');
	}

	if (!options.forceCreate && cachedProvision) {
		try {
			await provider.startVM(cachedProvision.name);
		} catch {
			// Ignore if already running or transient startup issue; we still verify below
		}
		const status = await provider.getStatus(cachedProvision.name);
		if (status === 'running') {
			return { ...cachedProvision, wasCreated: false };
		}
	}

	const existingRunning = options.forceCreate ? null : await findRunningQemuVMName();
	if (existingRunning) {
		const vm = await provider.getVM(existingRunning);
		cachedProvision = {
			name: existingRunning,
			version: vm?.chrMetadata?.version ?? 'unknown',
			architecture,
			backend: 'qemu',
			downloadUrl: '',
			wasCreated: false,
		};
		log(`Using existing running QEMU VM: ${existingRunning}`);
		return cachedProvision;
	}

	const existingStopped = options.forceCreate ? null : await findStoppedQemuVMName();
	if (existingStopped) {
		log(`Starting existing stopped QEMU VM: ${existingStopped}`);
		await provider.startVM(existingStopped);
		const vm = await provider.getVM(existingStopped);
		cachedProvision = {
			name: existingStopped,
			version: vm?.chrMetadata?.version ?? 'unknown',
			architecture,
			backend: 'qemu',
			downloadUrl: '',
			wasCreated: false,
		};
		return cachedProvision;
	}

	log(`Provisioning QEMU CHR VM for arch=${architecture} (forceCreate=${options.forceCreate ?? false})`);
	const releases = await fetchCHRReleases('tikoci', 'mikropkl');

	const versionPriority = [
		...(options.preferredVersion ? [options.preferredVersion] : []),
		...(options.candidateVersions ?? []),
	];

	const releaseCandidates = versionPriority.length > 0
		? versionPriority
			.map(v => releases.find(r => r.routerOSVersion === v))
			.filter((r): r is NonNullable<typeof r> => Boolean(r))
		: releases;

	if (releaseCandidates.length === 0) {
		throw new Error('No CHR release candidates found for requested versions');
	}

	const selected = releaseCandidates
		.map(release => {
			const image = release.images.find(img => img.backend === 'qemu' && img.architecture === architecture);
			return image ? { release, image } : null;
		})
		.find((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

	if (!selected) {
		throw new Error(`No qemu image found for architecture ${architecture} in selected releases`);
	}

	const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tikbook-chr-qemu-'));
	const zipPath = path.join(tempRoot, selected.image.assetName);
	const extractDir = path.join(tempRoot, 'extract');
	fs.mkdirSync(extractDir, { recursive: true });

	log(`Downloading ${selected.image.assetName}`);
	const response = await axios.get(selected.image.downloadUrl, {
		responseType: 'stream',
		timeout: 120000,
	});

	await new Promise<void>((resolve, reject) => {
		const writer = fs.createWriteStream(zipPath);
		response.data.pipe(writer);
		writer.on('finish', () => resolve());
		writer.on('error', reject);
	});

	log(`Extracting ${selected.image.assetName}`);
	await execFileAsync('unzip', ['-o', zipPath, '-d', extractDir], { timeout: 120000 });

	const bundlePath = walkForFirstUtmBundle(extractDir);
	if (!bundlePath) {
		throw new Error(`Could not find .utm bundle after extracting ${selected.image.assetName}`);
	}

	log(`Importing bundle via AppleScript: ${bundlePath}`);
	const createdVM = await provider.createVM?.({
		name: '',
		chrVersion: selected.release.routerOSVersion,
		downloadUrl: selected.image.downloadUrl,
		importMethod: 'applescript',
		localBundlePath: bundlePath,
	});

	if (!createdVM) {
		throw new Error('Provider did not return created VM metadata');
	}

	await provider.startVM(createdVM.name);

	cachedProvision = {
		name: createdVM.name,
		version: selected.release.routerOSVersion,
		architecture,
		backend: 'qemu',
		downloadUrl: selected.image.downloadUrl,
		wasCreated: true,
	};

	return cachedProvision;
}
