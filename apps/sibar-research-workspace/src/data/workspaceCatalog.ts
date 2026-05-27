import {
  buildWorkspaceHomeProjectionFromMission,
  buildWorkspaceSessionFixtureFromMission,
  frontierLabMissionUiProjection,
} from "../state/workspaceProjection";
import type {
  WorkspaceHomeProjection,
  WorkspaceSessionFixture,
} from "../state/workspaceProjection";

export const defaultStudyCourseTitle =
  frontierLabMissionUiProjection.mission_brief.title;

export const workspaceHomeProjection: WorkspaceHomeProjection =
  buildWorkspaceHomeProjectionFromMission(frontierLabMissionUiProjection);

export const firstWorkspaceSessionFixture: WorkspaceSessionFixture =
  buildWorkspaceSessionFixtureFromMission(frontierLabMissionUiProjection);
