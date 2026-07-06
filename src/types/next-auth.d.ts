import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: Role[];
      operatorId: string | null;
      godMode: boolean;
      mfaEnabled: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    roles?: Role[];
    operatorId?: string | null;
    mfaEnabled?: boolean;
  }
}

// Les callbacks NextAuth typent `token` avec l'identité @auth/core/jwt —
// augmenter le module façade "next-auth/jwt" ne fusionne pas avec elle.
declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    roles?: Role[];
    operatorId?: string | null;
    godMode?: boolean;
    mfaEnabled?: boolean;
    emailVerified?: boolean;
  }
}
