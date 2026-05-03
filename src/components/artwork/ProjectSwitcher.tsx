import React from "react";
import type { ArtworkManifest, Project } from "./types";

interface ProjectSwitcherProps {
  manifest: ArtworkManifest | null;
  activeProject: Project;
  onSwitch: (project: Project) => void;
}

const ALL_PROJECTS: Project[] = ["bluefin", "bazzite", "aurora"];

export default function ProjectSwitcher({
  manifest,
  activeProject,
  onSwitch,
}: ProjectSwitcherProps): React.JSX.Element {
  return (
    <div role="tablist" aria-label="Artwork projects">
      {ALL_PROJECTS.map((project) => {
        const isActive = activeProject === project;
        const label = manifest?.projects?.[project]?.label ?? project;
        return (
          <button
            key={project}
            type="button"
            className={`button ${isActive ? "button--primary" : "button--secondary"}`}
            aria-pressed={isActive}
            onClick={() => onSwitch(project)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
