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

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    roles?: Role[];
    operatorId?: string | null;
    godMode?: boolean;
    mfaEnabled?: boolean;
  }
}
