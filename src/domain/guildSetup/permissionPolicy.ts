export interface ManagedPermissionOverwrite {
  readonly id: string;
  readonly allow: readonly bigint[];
  readonly deny: readonly bigint[];
}

export interface PermissionOverwriteSnapshot {
  readonly allow: bigint;
  readonly deny: bigint;
}

export function combinePermissions(
  permissions: readonly bigint[],
): bigint {
  return permissions.reduce(
    (combined, permission) => combined | permission,
    0n,
  );
}

export function permissionOverwriteMatches(
  actual: PermissionOverwriteSnapshot | undefined,
  expected: ManagedPermissionOverwrite,
): boolean {
  return (
    actual !== undefined &&
    actual.allow === combinePermissions(expected.allow) &&
    actual.deny === combinePermissions(expected.deny)
  );
}
