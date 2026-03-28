const clerkIssuerDomain = process.env.CLERK_FRONTEND_API_URL;

if (!clerkIssuerDomain) {
  throw new Error(
    "Missing Clerk issuer domain for Convex auth. Set CLERK_JWT_ISSUER_DOMAIN or CLERK_FRONTEND_API_URL.",
  );
}

export default {
  providers: [
    {
      domain: clerkIssuerDomain.replace(/\/$/, ""),
      applicationID: "convex",
    },
  ],
};
