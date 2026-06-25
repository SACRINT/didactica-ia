import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { upsertTeacher } from './db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      try {
        await upsertTeacher({
          name: user.name || user.email,
          email: user.email,
        });
        return true;
      } catch (error) {
        console.error('Error upserting teacher on sign in:', error);
        return false;
      }
    },
    async session({ session }) {
      return session;
    },
    async jwt({ token }) {
      return token;
    },
  },
  pages: {
    signIn: '/es/login',
    error: '/es/login',
  },
});
