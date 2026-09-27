export type ReleaseId = "stable";
export type ArchId = "x86";
export type GpuId = "amd" | "nvidia";

export type ChooserStep = "release" | "architecture" | "gpu" | "download";

export interface ChooserSelection {
  stream?: ReleaseId;
  arch?: ArchId;
  gpu?: GpuId;
}

export interface ChooserState {
  step: ChooserStep;
  selection: ChooserSelection;
}

export const INITIAL_CHOOSER_STATE: ChooserState = {
  step: "release",
  selection: {},
};

export const BASE_DOWNLOAD_URL = "https://download.projectbluefin.io";
export const REGISTRY_URL =
  "https://github.com/orgs/ublue-os/packages?repo_name=bluefin";

export function selectRelease(
  state: ChooserState,
  release: ReleaseId,
  available = true,
): ChooserState {
  if (!available) {
    return state;
  }
  return {
    step: "architecture",
    selection: {
      stream: release,
    },
  };
}

export function selectArchitecture(
  state: ChooserState,
  arch: ArchId,
): ChooserState {
  return {
    step: "gpu",
    selection: {
      ...state.selection,
      arch,
      gpu: undefined,
    },
  };
}

export function selectGpu(state: ChooserState, gpu: GpuId): ChooserState {
  return {
    step: "download",
    selection: {
      ...state.selection,
      gpu,
    },
  };
}

export function navigateBack(state: ChooserState): ChooserState {
  const { step, selection } = state;

  if (step === "download") {
    return {
      step: "gpu",
      selection: {
        ...selection,
        gpu: undefined,
      },
    };
  }

  if (step === "gpu") {
    return {
      step: "architecture",
      selection: {
        ...selection,
        arch: undefined,
        gpu: undefined,
      },
    };
  }

  if (step === "architecture") {
    return {
      step: "release",
      selection: {},
    };
  }

  return state;
}

export function resetChooser(): ChooserState {
  return {
    step: "release",
    selection: {},
  };
}

export function formatImageName(selection: ChooserSelection): string {
  let name = "bluefin";

  if (selection.gpu === "nvidia") {
    name += "-nvidia-open";
  }

  name += `-${selection.stream ?? "stable"}`;

  if (selection.arch === "x86") {
    name += "-x86_64";
  }

  return name;
}

export function formatIsoFilename(selection: ChooserSelection): string {
  return `${formatImageName(selection)}.iso`;
}

export function formatIsoUrl(selection: ChooserSelection): string {
  return `${BASE_DOWNLOAD_URL}/${formatIsoFilename(selection)}`;
}

export function formatChecksumUrl(selection: ChooserSelection): string {
  return `${BASE_DOWNLOAD_URL}/${formatIsoFilename(selection)}-CHECKSUM`;
}

export function formatBootcCommand(selection: ChooserSelection): string {
  const image = selection.gpu === "nvidia" ? "bluefin-nvidia-open" : "bluefin";
  return `sudo bootc switch ghcr.io/ublue-os/${image}:stable --enforce-container-sigpolicy`;
}
