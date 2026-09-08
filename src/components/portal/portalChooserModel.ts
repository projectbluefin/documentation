export type ReleaseId = "stable" | "lts";
export type ArchId = "x86" | "arm";
export type GpuId = "amd" | "nvidia";
export type KernelId = "regular" | "hwe";

export type ChooserStep =
  "release" | "architecture" | "gpu" | "kernel" | "download";

export interface ChooserSelection {
  stream?: ReleaseId;
  arch?: ArchId;
  gpu?: GpuId;
  kernel?: KernelId;
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
  if (arch === "arm") {
    return {
      step: "download",
      selection: {
        ...state.selection,
        stream: "lts",
        arch: "arm",
        gpu: undefined,
        kernel: "regular",
      },
    };
  }

  return {
    step: "gpu",
    selection: {
      ...state.selection,
      arch: "x86",
      gpu: undefined,
      kernel: undefined,
    },
  };
}

export function selectGpu(state: ChooserState, gpu: GpuId): ChooserState {
  if (state.selection.stream === "lts") {
    if (gpu === "nvidia") {
      return {
        step: "download",
        selection: {
          ...state.selection,
          gpu: "nvidia",
          kernel: "regular",
        },
      };
    }
    return {
      step: "kernel",
      selection: {
        ...state.selection,
        gpu: "amd",
        kernel: undefined,
      },
    };
  }

  return {
    step: "download",
    selection: {
      ...state.selection,
      gpu,
      kernel: "regular",
    },
  };
}

export function selectKernel(
  state: ChooserState,
  kernel: KernelId,
): ChooserState {
  return {
    step: "download",
    selection: {
      ...state.selection,
      kernel,
    },
  };
}

export function navigateBack(state: ChooserState): ChooserState {
  const { step, selection } = state;

  if (step === "download") {
    if (selection.arch === "arm") {
      return {
        step: "architecture",
        selection: {
          ...selection,
          arch: undefined,
          gpu: undefined,
          kernel: undefined,
        },
      };
    }
    if (selection.stream === "lts" && selection.gpu === "amd") {
      return {
        step: "kernel",
        selection: {
          ...selection,
          kernel: undefined,
        },
      };
    }
    return {
      step: "gpu",
      selection: {
        ...selection,
        gpu: undefined,
        kernel: undefined,
      },
    };
  }

  if (step === "kernel") {
    return {
      step: "gpu",
      selection: {
        ...selection,
        gpu: undefined,
        kernel: undefined,
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
    if (selection.stream === "lts") {
      name += "-gdx";
    } else {
      name += "-nvidia-open";
    }
  }

  name += `-${selection.stream ?? "stable"}`;

  if (
    selection.stream === "lts" &&
    selection.kernel === "hwe" &&
    selection.gpu !== "nvidia"
  ) {
    name += "-hwe";
  }

  switch (selection.arch) {
    case "x86":
      name += "-x86_64";
      break;
    case "arm":
      name += "-aarch64";
      break;
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
