function getIssuer() {
  const issuer = process.env.ISSUER ?? "";
  return issuer.endsWith("/") ? issuer : `${issuer}/`;
}

export async function signin(req, res) {
  const issuer = process.env.ISSUER ?? "";
  const clientId = process.env.CLIENT_ID ?? "";

  const signinUrl = issuer.endsWith("/")
    ? `${issuer}api/auth/signin?client_id=${clientId}`
    : `${issuer}/api/auth/signin?client_id=${clientId}`;

  return res.redirect(signinUrl);
}

export async function callback(req, res) {
  const { code } = req.body;

  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    const issuer = getIssuer();

    const tokenRes = await fetch(`${issuer}api/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: process.env.REDIRECT_URI,
      }),
    });

    const rawResponse = await tokenRes.json();

    if (!tokenRes.ok) {
      return res
        .status(401)
        .json({ error: "Token exchange failed", detail: rawResponse });
    }

    const {
      data: { accessToken, refreshToken },
    } = rawResponse;

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Auth callback error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}

export async function me(req, res) {
  const token = req.cookies?.access_token;

  if (!token) return res.status(401).json({ authenticated: false });

  try {
    const issuer = getIssuer();

    const userRes = await fetch(`${issuer}api/auth/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const rawResponse = await userRes.json();

    if (!userRes.ok) return res.status(401).json({ authenticated: false });

    const { data: user } = rawResponse;
    return res.json({ authenticated: true, user });
  } catch (err) {
    console.error("Auth me error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}

export function logout(req, res) {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  return res.json({ success: true });
}
