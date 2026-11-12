// Augment Express Request with the authenticated user payload.
import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        universityId: string;
        role: 'super_admin' | 'cc' | 'assistant';
        status: 'pending' | 'approved' | 'suspended';
        matricule: string;
        email: string;
        fullName: string;
      };
    }
  }
}

export {};