import { SetMetadata } from '@nestjs/common';

// Concept: Custom metadata decorator to attach authorized roles to Route controllers
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
