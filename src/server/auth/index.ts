import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { authenticator } from "otplib";
import type { Role } from "@prisma/client";
import { db } from "@/server/db";
import { env, isGodMode } from "@/env";
import { decrypt } from "@/server/vault/crypto";

// Auth (cahier §11.2) : credentials bcrypt toujours actif, Google OAuth conditionnel
// (uniquement si GOOGLE_CLIENT_ID/SECRET présents), sessions JWT, god-mode par env,
// MFA TOTP pour ADMIN (vérifié au login dès qu'enrôlé).

/** Le compte exige un code TOTP (MFA enrôlé) — le formulaire de connexion révèle le champ code. */
export class MfaRequiredError extends CredentialsSignin {
  code = "mfa_required";
}

/** Code TOTP fourni mais invalide. */
export class MfaInvalidError extends CredentialsSignin {
  code = "mfa_invalid";
}

function googleEnabled(): boolean {
  return !!(env().GOOGLE_CLIENT_ID && env().GOOGLE_CLIENT_SECRET);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  secret: env().NEXTAUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/connexion",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        totp: {},
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const totp = String(credentials?.totp ?? "").trim();
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        if (user.mfaEnabled && user.mfaSecret) {
          if (!totp) throw new MfaRequiredError();
          const valid = authenticator.verify({ token: totp, secret: decrypt(user.mfaSecret) });
          if (!valid) throw new MfaInvalidError();
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          roles: user.roles,
          operatorId: user.operatorId,
          mfaEnabled: user.mfaEnabled,
        };
      },
    }),
    ...(googleEnabled()
      ? [
          Google({
            clientId: env().GOOGLE_CLIENT_ID,
            clientSecret: env().GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger }) => {
      if (user) {
        token.uid = user.id;
        token.roles = (user.roles as Role[] | undefined) ?? ["USER"];
        token.operatorId = user.operatorId ?? null;
        token.mfaEnabled = user.mfaEnabled ?? false;
      }
      // Rafraîchit rôles/MFA depuis la base quand la session est mise à jour (update()).
      if (trigger === "update" && token.uid) {
        const fresh = await db.user.findUnique({ where: { id: token.uid } });
        if (fresh) {
          token.roles = fresh.roles;
          token.operatorId = fresh.operatorId;
          token.mfaEnabled = fresh.mfaEnabled;
        }
      }
      // God-mode (cahier §2) : emails toujours élevés ADMIN + bypass des gates.
      const god = isGodMode(token.email);
      token.godMode = god;
      if (god && !(token.roles ?? []).includes("ADMIN")) {
        token.roles = [...(token.roles ?? []), "ADMIN"];
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token.uid) session.user.id = token.uid;
      session.user.roles = token.roles ?? ["USER"];
      session.user.operatorId = token.operatorId ?? null;
      session.user.godMode = token.godMode ?? false;
      session.user.mfaEnabled = token.mfaEnabled ?? false;
      return session;
    },
  },
  events: {
    // Un utilisateur Google arrive avec le rôle USER par défaut ; il est rattaché
    // au tenant par défaut à la première connexion (dans le callback signIn ci-dessous).
    signIn: async ({ user, account }) => {
      if (account?.provider === "google" && user.id) {
        const dbUser = await db.user.findUnique({ where: { id: user.id } });
        if (dbUser && !dbUser.operatorId) {
          const op = await db.operator.findFirst({ where: { slug: "upgraders" } });
          if (op) await db.user.update({ where: { id: user.id }, data: { operatorId: op.id } });
        }
      }
    },
  },
});

export { googleEnabled };
