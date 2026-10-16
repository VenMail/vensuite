export function isWorkspaceHeaderExpanded(collapsible: boolean, collapsed: boolean): boolean {
  return !collapsible || !collapsed;
}
